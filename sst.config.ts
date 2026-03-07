import type {} from './.sst/platform/config.d.ts'

type Stage = 'dev' | 'production'

export default $config({
  app(input) {
    const stage = assertStage(input?.stage ?? 'dev')
    return {
      name: 'monacube', // AWSのリソース名などに使われる
      home: 'aws',
      stage,
      removal: stage === 'production' ? 'retain' : 'remove',
      protect: stage === 'production',
    }
  },

  async run() {
    const stage = assertStage($app.stage)
    const { web: webDomain, api: apiDomain, img: imgDomain } = domains(stage)

    // Database: Single DynamoDB Table
    const appTable = new sst.aws.Dynamo('AppTable', {
      fields: {
        pk: 'string',
        sk: 'string',
        GSI1PK: 'string',
        GSI1SK: 'string',
        GSI2PK: 'string',
      },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      globalIndexes: {
        GSI1: {
          hashKey: 'GSI1PK',
          rangeKey: 'GSI1SK',
        },
        GSI2: {
          hashKey: 'GSI2PK',
          rangeKey: 'GSI1SK',
        },
      },
      ttl: 'ttl',
    })

    // Image hosting: S3 + CloudFront
    const imageBucketAllowOrigins = [`https://${webDomain}`]
    if (stage === 'dev') imageBucketAllowOrigins.push('http://localhost:3000') // 開発用

    const imageBucket = new sst.aws.Bucket('ImageBucket', {
      access: 'cloudfront',
      cors: {
        allowOrigins: imageBucketAllowOrigins,
        allowMethods: ['GET', 'HEAD', 'PUT'],
        allowHeaders: ['*'],
      },
    })

    const imageCdn = new sst.aws.Router('ImageCdn', {
      domain: { name: imgDomain },
      routes: {
        '/*': {
          bucket: imageBucket,
        },
      },
    })

    // ========= API (API Gateway + Lambda) =========

    // Lambdaで使う秘密の値を宣言  値は `sst secret` で管理する
    const JWT_SECRET = new sst.Secret('JWT_SECRET') // 32byte以上のランダム文字列

    // Lambdaで使う通常の環境変数
    const functionEnv = {
      APP_NAME: 'MonaCube',
      STAGE: stage,
      WEB_ORIGIN: `https://${webDomain}`,
      IMG_ORIGIN: `https://${imgDomain}`,
      JWT_ISSUER: `https://${apiDomain}`,
      JWT_AUDIENCE: `https://${webDomain}`,
      APP_TABLE: appTable.name,
      IMG_BUCKET: imageBucket.name,
    }

    // API: API Gateway + Lambda
    const apiRouteDefaults = {
      link: [appTable, JWT_SECRET, imageBucket],
      environment: functionEnv,
      memory: '1024 MB' as const,
    }
    const api = new sst.aws.ApiGatewayV2('Api', {
      domain: { name: apiDomain },
      cors: {
        allowOrigins: [`https://${webDomain}`],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['authorization', 'content-type'],
      },
      transform: {
        route: {
          handler: (args) => {
            args.link ??= apiRouteDefaults.link
            args.environment ??= apiRouteDefaults.environment
            args.memory ??= apiRouteDefaults.memory
          },
        },
      },
    })

    // public API routes (no authentication required)
    api.route('GET /health', 'packages/functions/src/health.handler')
    api.route('POST /auth/challenge', 'packages/functions/src/auth_challenge.handler')
    api.route('POST /auth/verify', 'packages/functions/src/auth_verify.handler')
    api.route('GET /works', 'packages/functions/src/works.handler')
    api.route('GET /works/{workId}', 'packages/functions/src/work.get')
    api.route('GET /users/{userId}', 'packages/functions/src/user.handler')

    // private API routes (authentication required)
    api.route('POST /privateApiSample', 'packages/functions/src/privateApiSample.handler')
    api.route('POST /works/uploads/init', 'packages/functions/src/works_uploads_init.handler')
    api.route('POST /works/uploads/finalize', {
      ...apiRouteDefaults,
      handler: 'packages/functions/src/works_uploads_finalize.handler',
      memory: '2048 MB',
      nodejs: { install: ['sharp'] },
    })
    // api.route('PUT /works/{workId}', 'packages/functions/src/work.put')
    // api.route('DELETE /works/{workId}', 'packages/functions/src/work.delete')
    // api.route('POST /me/icon/uploads/init', 'packages/functions/src/me_icon_uploads_init.handler')
    // api.route('POST /me/icon/uploads/finalize', 'packages/functions/src/me_icon_uploads_finalize.handler')

    // ========= Frontend (Nuxt SPA Static) =========
    const web = new sst.aws.StaticSite('Web', {
      path: 'apps/web',
      build: {
        command: 'npm run generate',
        output: '.output/public',
      },
      domain: { name: webDomain },
      environment: {
        NUXT_PUBLIC_API_BASE: `https://${apiDomain}`,
        NUXT_PUBLIC_IMG_BASE: `https://${imgDomain}`,
        NUXT_PUBLIC_STAGE: stage,
      },
    })

    return {
      web: web.url,
      api: api.url,
      img: imageCdn.url,
      webDomain,
      apiDomain,
      imgDomain,
      table: appTable.name,
      imageBucket: imageBucket.name,
    }
  },
})

function assertStage(stage: string): Stage {
  if (stage === 'dev' || stage === 'production') return stage
  throw new Error(`Invalid stage: ${stage}. Use "dev" or "production".`)
}

function domains(stage: Stage) {
  const root = 'monacube.com' // root part of hostname
  const app = 'gallery' // appname part of hostname

  switch (stage) {
    case 'production':
      return {
        web: `${app}.${root}`,
        api: `api.${app}.${root}`,
        img: `img.${app}.${root}`,
      }
    case 'dev':
      return {
        web: `${app}-dev.${root}`,
        api: `api.${app}-dev.${root}`,
        img: `img.${app}-dev.${root}`,
      }
    default:
      throw new Error(`Invalid stage: ${stage}`)
  }
}
