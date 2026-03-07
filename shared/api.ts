// shared/api.ts
// APIのリクエスト/レスポンス型定義

import type { UserRecord, UserStatsRecord, WorkRecord } from './ddbRecord'

// MARK: public API

// GET /health
export type HealthOk = { ok: true }

// POST /auth/challenge
export type AuthChallengeReqBody = {
  address: string
}
export type AuthChallengeOk = {
  nonce: string
  message: string
  expiresAt: number
}

// POST /auth/verify
export type AuthVerifyReqBody = {
  address: string
  nonce: string
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
}

// MARK: private API (認証が必要なAPI)

// POST /privateApiSample
export type PrivateApiSampleOk = {
  ok: true
  userId: string
}

// POST /works/uploads/init
export type WorksUploadsInitReqBody = {
  contentType: string
  declaredBytes: number
}
export type WorksUploadsInitOk = {
  uploadId: string
  uploadUrl: string
  method: 'PUT'
  headers: {
    'content-type': string
  }
  s3Key: string
  expiresIn: number
}

// POST /works/uploads/finalize
export type WorksUploadsFinalizeReqBody = {
  uploadId: string
  title: string
  description: string
  tags?: string[]
}
export type WorksUploadsFinalizeOk = {
  work: WorkRecord
  imageUrl: string
}
