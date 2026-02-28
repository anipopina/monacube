import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import * as crypto from 'node:crypto'

import type { AuthChallengeOk, AuthChallengeRequest } from '@shared/api'

import { mustGetEnv, responseJson, normalizeAddress } from '../lib/util'
import { ddb } from '../lib/ddb'

export async function handler(event: { body?: string }) {
  const appName = mustGetEnv('APP_NAME')
  const table = mustGetEnv('APP_TABLE')
  const webOrigin = mustGetEnv('WEB_ORIGIN')

  // Parse request body
  let request: Partial<AuthChallengeRequest> = {}
  try {
    request = event?.body ? JSON.parse(event.body) : {}
  } catch {
    return responseJson(400, { error: 'invalid_json' })
  }
  const address = request.address ? normalizeAddress(request.address) : ''
  if (!address) return responseJson(400, { error: 'missing_address' })

  const nonce = crypto.randomBytes(16).toString('hex')
  const now = Math.floor(Date.now() / 1000)
  const ttl = now + 5 * 60 // 5分有効

  // 署名させるメッセージ（SIWE風）
  const message = [
    `${appName} wants you to sign in with your Monacoin address:`,
    address,
    ``,
    `Origin: ${webOrigin}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date(now * 1000).toISOString()}`,
    `Expiration Time: ${new Date(ttl * 1000).toISOString()}`,
  ].join('\n')

  // 単一テーブル: Nonceエンティティ
  // pk=NONCE#<nonce>, sk=CHALLENGE, ttl=<unix sec>
  await ddb.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall({
        pk: `NONCE#${nonce}`,
        sk: 'CHALLENGE',
        address,
        message,
        ttl,
        createdAt: now,
      }),
      ConditionExpression: 'attribute_not_exists(pk)', // 被らないはずだけど一応
    }),
  )

  const responseBody: AuthChallengeOk = {
    nonce,
    message,
    expiresAt: ttl,
  }
  return responseJson(200, responseBody)
}
