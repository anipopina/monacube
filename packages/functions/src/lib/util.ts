import { Resource } from 'sst'
import { jwtVerify, type JWTPayload } from 'jose'

export type JsonResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

export type AccessTokenAuth = {
  subject: string
  payload: JWTPayload
}

export class HttpError extends Error {
  statusCode: number
  body: unknown

  constructor(statusCode: number, body: unknown) {
    super('HttpError')
    this.statusCode = statusCode
    this.body = body
  }
}

export function mustGetEnv(name: string): string {
  const v = process.env[name]
  if (v === undefined || v === '') throw new Error(`Missing env: ${name}`)
  return v
}

export function mustGetSecret(name: string): string {
  const v = Resource[name]?.value
  if (v === undefined || v === '') throw new Error(`Missing secret: ${name}`)
  return v
}

export function responseJson(statusCode: number, body: unknown): JsonResponse {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  }
}

export function responseFromError(err: unknown): JsonResponse {
  if (err instanceof HttpError) {
    return responseJson(err.statusCode, err.body)
  }
  console.error(err)
  return responseJson(500, { error: 'internal_error' })
}

export function normalizeAddress(address: string) {
  return address.trim().slice(0, 100)
}

export function jwtSecretKey(): Uint8Array {
  const jwtSecret = mustGetSecret('JWT_SECRET')
  return new TextEncoder().encode(jwtSecret)
}

/**
 * 認証付きAPIハンドラのラッパー
 */
export function privateApiHandler<
  TEvent extends {
    body?: string
    headers?: Record<string, string | undefined>
  },
>(inner: (event: TEvent, auth: AccessTokenAuth) => Promise<JsonResponse> | JsonResponse) {
  return async (event: TEvent): Promise<JsonResponse> => {
    try {
      const auth = await requireAccessToken(event.headers)
      return await inner(event, auth)
    } catch (err) {
      return responseFromError(err)
    }
  }
}

export async function requireAccessToken(headers?: Record<string, string | undefined>): Promise<AccessTokenAuth> {
  const issuer = mustGetEnv('JWT_ISSUER')
  const audience = mustGetEnv('JWT_AUDIENCE')

  const authorization = getHeader(headers, 'authorization')
  if (!authorization) throw new HttpError(401, { error: 'missing_authorization' })

  const token = parseBearerToken(authorization)
  if (!token) throw new HttpError(401, { error: 'invalid_authorization' })

  try {
    const { payload } = await jwtVerify(token, jwtSecretKey(), { issuer, audience })

    // auth.verify.ts が payload に typ: "access" を入れている前提
    if (payload.typ !== 'access') throw new HttpError(401, { error: 'invalid_token_type' })

    const subject = (payload.sub || '').trim()
    if (!subject) throw new HttpError(401, { error: 'missing_subject' })

    return { subject, payload }
  } catch (err) {
    // jwtVerify 由来の例外は 401 に正規化（詳細は漏らさない）
    if (err instanceof HttpError) throw err
    throw new HttpError(401, { error: 'invalid_token' })
  }
}

function getHeader(headers: Record<string, string | undefined> | undefined, name: string) {
  if (!headers) return ''
  const exact = headers[name]
  if (exact) return exact
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower && v) return v
  }
  return ''
}

function parseBearerToken(authorization: string): string {
  const m = /^Bearer\s+(.+?)\s*$/i.exec(authorization)
  return (m?.[1] || '').trim()
}
