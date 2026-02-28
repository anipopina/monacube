import type {} from './.sst/platform/config.d.ts'

type Stage = 'dev' | 'production'

export default $config({
  app(input) {
    const stage = assertStage(input?.stage ?? 'dev')
    return {
      name: 'appname', // CHANGEME: AWSのリソース名などに使われる
      home: 'aws',
      stage,
      removal: stage === 'production' ? 'retain' : 'remove',
      protect: stage === 'production',
    }
  },

  async run() {
    const stage = assertStage($app.stage)
    const { web: webDomain, api: apiDomain } = domains(stage)

    // Database: Single DynamoDB Table
    const appTable = new sst.aws.Dynamo('AppTable', {
      fields: { pk: 'string', sk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      ttl: 'ttl',
    })

    // API: API Gateway
    const api = new sst.aws.ApiGatewayV2('Api', {
      domain: { name: apiDomain },
      cors: {
        allowOrigins: [`https://${webDomain}`],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['authorization', 'content-type'],
      },
    })

    // Lambdaで使う秘密の値を宣言  値は `sst secret` で管理する
    const JWT_SECRET = new sst.Secret('JWT_SECRET') // 32byte以上のランダム文字列

    // Lambdaで使う通常の環境変数
    const functionEnv = {
      APP_NAME: 'App Name', // CHANGEME
      STAGE: stage,
      WEB_ORIGIN: `https://${webDomain}`,
      JWT_ISSUER: `https://${apiDomain}`,
      JWT_AUDIENCE: `https://${webDomain}`,
      APP_TABLE: appTable.name,
    }

    api.route('GET /health', {
      handler: 'packages/functions/src/health.handler',
      environment: functionEnv,
    })

    api.route('POST /auth/challenge', {
      handler: 'packages/functions/src/auth/challenge.handler',
      link: [appTable],
      environment: functionEnv,
    })

    api.route('POST /auth/verify', {
      handler: 'packages/functions/src/auth/verify.handler',
      link: [appTable, JWT_SECRET],
      environment: functionEnv,
    })

    api.route('POST /privateApiSample', {
      handler: 'packages/functions/src/privateApiSample.handler',
      link: [JWT_SECRET],
      environment: functionEnv,
    })

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
        NUXT_PUBLIC_STAGE: stage,
      },
    })

    return {
      web: web.url,
      api: api.url,
      webDomain,
      apiDomain,
      table: appTable.name,
    }
  },
})

function assertStage(stage: string): Stage {
  if (stage === 'dev' || stage === 'production') return stage
  throw new Error(`Invalid stage: ${stage}. Use "dev" or "production".`)
}

function domains(stage: Stage) {
  const root = 'komikikaku.com' // CHANGEME: root part of hostname
  const app = 'appname' // CHANGEME: appname part of hostname

  switch (stage) {
    case 'production':
      return {
        web: `${app}.${root}`,
        api: `api.${app}.${root}`,
      }
    case 'dev':
      return {
        web: `${app}-dev.${root}`,
        api: `api.${app}-dev.${root}`,
      }
    default:
      throw new Error(`Invalid stage: ${stage}`)
  }
}
