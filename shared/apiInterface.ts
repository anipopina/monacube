// shared/apiInterface.ts
// APIのリクエスト/レスポンス型定義

import type { UserRecord, UserStatsRecord, WorkRecord, TipRecord } from './ddbRecord'

export type Iso8601String = string
export type ContentType = string
export type Ulid = string
export type Hex = string
export type MonaAddress = string
export type UnixTimestamp = number

// MARK: public API

// GET /health
export type GetHealthOk = { ok: true }

// POST /auth/challenge
export type AuthChallengeReqBody = {
  address: MonaAddress
}
export type AuthChallengeOk = {
  nonce: Hex
  message: string
  expiresAt: UnixTimestamp
}

// POST /auth/verify
export type AuthVerifyReqBody = {
  address: MonaAddress
  nonce: Hex
  message: string
  signature: string
}
export type AuthVerifyOk = {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: UserRecord
  userStats: UserStatsRecord
}

// GET /works
export type GetWorksOk = {
  works: WorkRecord[]
  lastEvaluatedKey?: string // for pagination; if present, there are more items to fetch
}
export type GetWorksReqQuery = {
  limit?: number
  lastEvaluatedKey?: string
}

// GET /works/{workId}
export type GetWorkOk = {
  work: WorkRecord
}

// GET /users/{userId}
export type GetUserOk = {
  user: UserRecord
  userWorks: WorkRecord[]
  userStats?: UserStatsRecord
}
export type GetUserReqQuery = {
  includeUserStats?: boolean // whether to include userStats in the response; defaults to false
}

// MARK: private API (認証が必要なAPI)

// POST /works/uploads/init
export type WorksUploadsInitReqBody = {
  contentType: ContentType
  declaredBytes: number
}
export type WorksUploadsInitOk = {
  uploadId: Ulid
  uploadUrl: string
  method: 'PUT'
  headers: {
    'content-type': ContentType
  }
  s3Key: string
  expiresIn: number
}

// POST /works/uploads/finalize
export type WorksUploadsFinalizeReqBody = {
  uploadId: Ulid
  title: string
  description: string
}
export type WorksUploadsFinalizeOk = {
  work: WorkRecord
}

// GET /me/tips
export type GetMeTipsOk = {
  tips: TipRecord[]
}

// POST /me/balance/refresh
export type MeBalanceRefreshOk = {
  userStats: UserStatsRecord
}

// POST /me/legal/accept
export type MeLegalAcceptReqBody = {
  termsVersion: string
  privacyVersion: string
  signedAt: Iso8601String
  signature: string
}
export type MeLegalAcceptOk = {
  userStats: UserStatsRecord
}

// POST /tips
export type TipsReqBody = {
  signedTxHex: Hex
  feeSat: number
  workId?: Ulid
  message?: string
}
export type TipsOk = {
  tip: TipRecord
}
