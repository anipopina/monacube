import { GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import type { MeLegalAcceptOk, MeLegalAcceptReqBody } from '@shared/apiInterface'
import type { LegalAcceptanceRecord, UserStatsRecord } from '@shared/ddbRecord'
import { getLegalAcceptanceMessage } from '@shared/const'
import { getPrivacyByVersion } from '@shared/legal/privacy'
import { getTermsByVersion } from '@shared/legal/terms'

import { ddb } from '../lib/ddb'
import { HttpError, mustGetEnv, parseEventBody, privateApiHandler, responseJson } from '../lib/util'
import { verifySignature } from '../lib/monacoin'

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const userId = auth.subject

  const request = parseEventBody<MeLegalAcceptReqBody>(event)
  const termsVersion = (request.termsVersion || '').trim()
  const privacyVersion = (request.privacyVersion || '').trim()
  const signedAt = (request.signedAt || '').trim()
  const signature = (request.signature || '').trim()
  if (!termsVersion || !privacyVersion || !signedAt || !signature) throw new HttpError(400, { error: 'missing_fields' })

  if (!getTermsByVersion(termsVersion) || !getPrivacyByVersion(privacyVersion)) {
    throw new HttpError(400, { error: 'invalid_legal_version' })
  }

  // check signedAt is a valid ISO8601 string and not too far in the past or future (e.g. more than 1 hour difference from current time)
  const nowUnix = Math.floor(Date.now() / 1000)
  const signedAtUnix = Math.floor(new Date(signedAt).getTime() / 1000)
  const oneHourInSeconds = 60 * 60
  if (Math.abs(nowUnix - signedAtUnix) > oneHourInSeconds) throw new HttpError(400, { error: 'invalid_signed_at' })

  const signedMessage = getLegalAcceptanceMessage(userId, termsVersion, privacyVersion, signedAt)
  const isValidSignature = verifySignature(userId, signedMessage, signature)
  if (!isValidSignature) throw new HttpError(401, { error: 'invalid_signature' })

  const acceptanceRecord: LegalAcceptanceRecord = {
    pk: `USER#${userId}`,
    sk: `LEGAL#${signedAt}`,
    type: 'LEGAL_ACCEPTANCE',
    userId,
    termsVersion,
    privacyVersion,
    acceptedAt: signedAt,
    signedMessage,
    signature,
  }

  await ddb.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: table,
            Item: marshall(acceptanceRecord),
            ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
          },
        },
        {
          Update: {
            TableName: table,
            Key: marshall({ pk: `USER#${userId}`, sk: 'STATS' }),
            UpdateExpression: 'SET termsVer = :termsVersion, privacyVer = :privacyVersion',
            ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
            ExpressionAttributeValues: marshall({
              ':termsVersion': termsVersion,
              ':privacyVersion': privacyVersion,
            }),
          },
        },
      ],
    }),
  )

  const ddbResStats = await ddb.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `USER#${userId}`, sk: 'STATS' }),
      ConsistentRead: true,
    }),
  )
  if (!ddbResStats.Item) throw new HttpError(500, { error: 'user_stats_not_found' })

  const userStats = unmarshall(ddbResStats.Item) as UserStatsRecord

  const response: MeLegalAcceptOk = { userStats }
  return responseJson(200, response)
})
