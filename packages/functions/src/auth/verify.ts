import { GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { SignJWT } from 'jose'

import type { AuthVerifyOk, AuthVerifyRequest } from '@shared/api'

import { mustGetEnv, responseJson, jwtSecretKey, normalizeAddress } from '../lib/util'
import { ddb } from '../lib/ddb'
import { verifySignature } from '../lib/monacoin'

const ACCESS_TOKEN_EXPIRES_IN_SEC = 15 * 60 // 15分

export async function handler(event: { body?: string }) {
  const table = mustGetEnv('APP_TABLE')
  const issuer = mustGetEnv('JWT_ISSUER')
  const audience = mustGetEnv('JWT_AUDIENCE')

  // Parse request body
  let request: Partial<AuthVerifyRequest> = {}
  try {
    request = event?.body ? JSON.parse(event.body) : {}
  } catch {
    return responseJson(400, { error: 'invalid_json' })
  }
  const address = request.address ? normalizeAddress(request.address) : ''
  const nonce = (request.nonce || '').trim()
  const message = request.message || ''
  const signature = request.signature || ''
  if (!address || !nonce || !message || !signature) return responseJson(400, { error: 'missing_fields' })

  // 1) nonceレコード取得
  const got = await ddb.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `NONCE#${nonce}`, sk: 'CHALLENGE' }),
      ConsistentRead: true,
    }),
  )
  if (!got.Item) return responseJson(401, { error: 'invalid_nonce' })

  const nonceItem = unmarshall(got.Item) as {
    address: string
    message: string
    ttl: number
    usedAt?: number
  }

  const now = Math.floor(Date.now() / 1000)
  if (nonceItem.ttl <= now) return responseJson(401, { error: 'nonce_expired' })
  if (nonceItem.usedAt) return responseJson(401, { error: 'nonce_already_used' })
  if (nonceItem.address !== address) return responseJson(401, { error: 'address_mismatch' })
  if (nonceItem.message !== message) return responseJson(401, { error: 'message_mismatch' })

  // 2) 署名検証
  const ok = verifySignature(address, message, signature)
  if (!ok) return responseJson(401, { error: 'invalid_signature' })

  // 3) NONCE を消費（リプレイ防止）
  // UpdateItem + 条件で usedAt が未設定の時だけ通す
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: table,
        Key: marshall({ pk: `NONCE#${nonce}`, sk: 'CHALLENGE' }),
        UpdateExpression: 'SET usedAt = :now',
        ConditionExpression: 'attribute_not_exists(usedAt)',
        ExpressionAttributeValues: marshall({ ':now': now }),
      }),
    )
  } catch {
    return responseJson(401, { error: 'nonce_race_or_used' })
  }

  // 4) USER upsert
  // pk=USER#<address>, sk=PROFILE
  try {
    // 新規作成
    await ddb.send(
      new PutItemCommand({
        TableName: table,
        Item: marshall({
          pk: `USER#${address}`,
          sk: 'PROFILE',
          createdAt: now,
          lastLoginAt: now,
        }),
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    )
  } catch {
    // 既にある -> lastLoginAtだけ更新
    await ddb.send(
      new UpdateItemCommand({
        TableName: table,
        Key: marshall({ pk: `USER#${address}`, sk: 'PROFILE' }),
        UpdateExpression: 'SET lastLoginAt = :now',
        ExpressionAttributeValues: marshall({ ':now': now }),
      }),
    )
  }

  // 5) access token 発行
  const accessToken = await issueAccessToken({
    subject: address,
    issuer,
    audience,
    expiresInSec: ACCESS_TOKEN_EXPIRES_IN_SEC,
  })

  const responseBody: AuthVerifyOk = {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SEC,
  }
  return responseJson(200, responseBody)
}

function issueAccessToken(params: {
  subject: string // USER#<address> じゃなく "<address>" 推奨
  issuer: string
  audience: string
  expiresInSec: number
}) {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(params.issuer)
    .setAudience(params.audience)
    .setSubject(params.subject)
    .setExpirationTime(now + params.expiresInSec)
    .sign(jwtSecretKey())
}
