// shared/api.ts
// APIのリクエスト/レスポンス型定義

import type { UserRecord, UserStatsRecord, WorkRecord } from './ddbRecord'

// GET /health
export type HealthOk = { ok: true }

// POST /auth/challenge
export type AuthChallengeRequest = {
  address: string
}

export type AuthChallengeOk = {
  nonce: string
  message: string
  expiresAt: number
}

// POST /auth/verify
export type AuthVerifyRequest = {
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

// POST /works/uploads/init
export type WorksUploadInitRequest = {
  contentType: string
  declaredBytes: number
}

export type WorksUploadInitOk = {
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
export type WorksUploadFinalizeRequest = {
  uploadId: string
  title: string
  description: string
  tags?: string[]
}

export type WorksUploadFinalizeOk = {
  work: WorkRecord
  imageUrl: string
}

// POST /privateApiSample
export type PrivateApiSampleOk = {
  ok: true
  userId: string
}
