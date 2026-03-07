import { GetItemCommand, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { SignJWT } from 'jose'

import type { AuthVerifyOk, AuthVerifyReqBody } from '@shared/api'
import type { NonceRecord, UserRecord, UserStatsRecord } from '@shared/ddbRecord'

import { apiHandler, HttpError, jwtSecretKey, mustGetEnv, normalizeAddress, responseJson, parseEventBody } from './lib/util'
import { ddb } from './lib/ddb'
import { verifySignature } from './lib/monacoin'

const ACCESS_TOKEN_EXPIRES_IN_SEC = 15 * 60 // 15分

export const handler = apiHandler(async (event) => {
  const table = mustGetEnv('APP_TABLE')
  const issuer = mustGetEnv('JWT_ISSUER')
  const audience = mustGetEnv('JWT_AUDIENCE')

  const request = parseEventBody<AuthVerifyReqBody>(event)
  const address = request.address ? normalizeAddress(request.address) : ''
  const nonce = (request.nonce || '').trim()
  const message = request.message || ''
  const signature = request.signature || ''
  if (!address || !nonce || !message || !signature) throw new HttpError(400, { error: 'missing_fields' })

  // 1) nonceレコード取得
  const ddbResNonce = await ddb.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `NONCE#${nonce}`, sk: 'CHALLENGE' }),
      ConsistentRead: true,
    }),
  )
  if (!ddbResNonce.Item) throw new HttpError(401, { error: 'invalid_nonce' })

  const nonceItem = unmarshall(ddbResNonce.Item) as NonceRecord

  const nowUnix = Math.floor(Date.now() / 1000)
  const nowIso = new Date(nowUnix * 1000).toISOString()
  if (nonceItem.ttl <= nowUnix) throw new HttpError(401, { error: 'nonce_expired' })
  if (nonceItem.usedAt) throw new HttpError(401, { error: 'nonce_already_used' })
  if (nonceItem.address !== address) throw new HttpError(401, { error: 'address_mismatch' })
  if (nonceItem.message !== message) throw new HttpError(401, { error: 'message_mismatch' })

  // 2) 署名検証
  const ok = verifySignature(address, message, signature)
  if (!ok) throw new HttpError(401, { error: 'invalid_signature' })

  // 3) NONCE を消費（リプレイ防止）
  // UpdateItem + 条件で usedAt が未設定の時だけ通す
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: table,
        Key: marshall({ pk: `NONCE#${nonce}`, sk: 'CHALLENGE' }),
        UpdateExpression: 'SET usedAt = :now',
        ConditionExpression: 'attribute_not_exists(usedAt)',
        ExpressionAttributeValues: marshall({ ':now': nowIso }),
      }),
    )
  } catch {
    throw new HttpError(401, { error: 'nonce_race_or_used' })
  }

  // 4) USER upsert
  let userRecord: UserRecord
  let userStatsRecord: UserStatsRecord
  try {
    // 存在確認
    const ddbResUser = await ddb.send(
      new GetItemCommand({
        TableName: table,
        Key: marshall({ pk: `USER#${address}`, sk: 'PROFILE' }),
        ConsistentRead: true,
      }),
    )

    if (!ddbResUser.Item) {
      // なければ USER, USER_STATS を新規作成
      userRecord = {
        pk: `USER#${address}`,
        sk: 'PROFILE',
        type: 'USER',
        userId: address,
        name: `monar-${address.slice(0, 6)}`,
        bio: '',
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      userStatsRecord = {
        pk: `USER#${address}`,
        sk: 'STATS',
        type: 'USER_STATS',
        balanceSat: 0,
        lastLoginAt: nowIso,
      }
      await ddb.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            {
              Put: {
                TableName: table,
                Item: marshall(userRecord),
                // いちおう上書き防止
                // attribute_not_exists(pk) だけでも大丈夫だけど、意図を明示するためにskも見ておく
                ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
              },
            },
            {
              Put: {
                TableName: table,
                Item: marshall(userStatsRecord),
              },
            },
          ],
        }),
      )
    } else {
      // 既存ユーザー
      userRecord = unmarshall(ddbResUser.Item) as UserRecord

      // USER_STATS レコードも取得
      const ddbResUserStats = await ddb.send(
        new GetItemCommand({
          TableName: table,
          Key: marshall({ pk: `USER#${address}`, sk: 'STATS' }),
        }),
      )
      if (!ddbResUserStats.Item) throw new Error('USER_STATS record not found for existing user')
      userStatsRecord = unmarshall(ddbResUserStats.Item) as UserStatsRecord
      userRecord.updatedAt = nowIso

      // lastLoginAt を更新
      await ddb.send(
        new UpdateItemCommand({
          TableName: table,
          Key: marshall({ pk: `USER#${address}`, sk: 'STATS' }),
          UpdateExpression: 'SET lastLoginAt = :now',
          ExpressionAttributeValues: marshall({ ':now': nowIso }),
        }),
      )
    }
  } catch (error) {
    console.error('DynamoDB error in auth_verify', { address, nonce, error })
    throw new HttpError(500, { error: 'db_error' })
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
    user: userRecord,
    userStats: userStatsRecord,
  }
  return responseJson(200, responseBody)
})

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
