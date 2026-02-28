// shared/api.ts
// APIのリクエスト/レスポンス型定義

// /health
export type HealthOk = { ok: true }

// /auth/challenge
export type AuthChallengeRequest = {
  address: string
}

export type AuthChallengeOk = {
  nonce: string
  message: string
  expiresAt: number
}

// /auth/verify
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
}

// /privateApiSample
export type PrivateApiSampleOk = {
  ok: true
}
