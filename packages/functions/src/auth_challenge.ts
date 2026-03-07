import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import * as crypto from 'node:crypto'

import type { AuthChallengeOk, AuthChallengeReqBody } from '@shared/api'
import type { NonceRecord } from '@shared/ddbRecord'

import { apiHandler, HttpError, mustGetEnv, normalizeAddress, responseJson, parseEventBody } from './lib/util'
import { ddb } from './lib/ddb'

export const handler = apiHandler(async (event) => {
  const appName = mustGetEnv('APP_NAME')
  const table = mustGetEnv('APP_TABLE')
  const webOrigin = mustGetEnv('WEB_ORIGIN')

  const request = parseEventBody<AuthChallengeReqBody>(event)
  const address = request.address ? normalizeAddress(request.address) : ''
  if (!address) throw new HttpError(400, { error: 'missing_address' })

  const nonce = crypto.randomBytes(16).toString('hex')
  const nowUnix = Math.floor(Date.now() / 1000)
  const nowIso = new Date(nowUnix * 1000).toISOString()
  const ttl = nowUnix + 5 * 60 // 5分有効

  // 署名させるメッセージ（SIWE風）
  const message = [
    `${appName} wants you to sign in with your Monacoin address:`,
    address,
    ``,
    `Origin: ${webOrigin}`,
    `Nonce: ${nonce}`,
    `Issued At: ${nowIso}`,
    `Expiration Time: ${new Date(ttl * 1000).toISOString()}`,
  ].join('\n')

  const nonceRecord: NonceRecord = {
    pk: `NONCE#${nonce}`,
    sk: 'CHALLENGE',
    type: 'NONCE',
    ttl,
    address,
    message,
    createdAt: nowIso,
  }
  await ddb.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall(nonceRecord),
      ConditionExpression: 'attribute_not_exists(pk)', // 被らないはずだけど一応
    }),
  )

  const responseBody: AuthChallengeOk = {
    nonce,
    message,
    expiresAt: ttl,
  }
  return responseJson(200, responseBody)
})
