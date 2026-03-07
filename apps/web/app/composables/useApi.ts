// apps/web/app/composables/useApi.ts
// APIの型付きラッパーを提供するcomposable

import type {
  HealthOk,
  AuthChallengeReqBody,
  AuthChallengeOk,
  AuthVerifyReqBody,
  AuthVerifyOk,
  PrivateApiSampleOk,
  WorksUploadsInitOk,
  WorksUploadsInitReqBody,
  WorksUploadsFinalizeReqBody,
  WorksUploadsFinalizeOk,
  GetWorksOk,
  GetWorkOk,
  GetUserOk,
  GetWorksReqQuery,
} from '@shared/api'
import { FetchError } from 'ofetch'

export const useApi = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const { user, login, logout } = useWalletAuth()

  // ベースfetch: APIのURLを自動付与
  const apiFetch = <T>(path: string, options?: Parameters<typeof $fetch>[1]) => $fetch<T>(`${apiBase}${path}`, options)

  // 認証付きfetch: アクセストークンを自動付与し、401エラー時に自動ログアウト、必要ならセッション更新
  const authedApiFetch = async <T>(path: string, options?: Parameters<typeof $fetch>[1]): Promise<T> => {
    if (!user.value) throw new Error('User not logged in')
    await login() // ウォレットのロックとセッション切れに対応
    try {
      return await apiFetch<T>(path, {
        ...options, // ここで options.headers も入るけど下の headers で上書きする
        headers: {
          Authorization: `Bearer ${user.value.accessToken}`,
          ...options?.headers,
        },
      })
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        if (error?.status === 401) logout() // 401エラー時は自動ログアウト
      }
      throw error
    }
  }

  // ----------------------------------------------------------------
  // MARK: Public endpoints
  // ----------------------------------------------------------------

  // GET /health
  const getHealth = () => apiFetch<HealthOk>('/health')

  // POST /auth/challenge
  const postAuthChallenge = (body: AuthChallengeReqBody) => apiFetch<AuthChallengeOk>('/auth/challenge', { method: 'POST', body })

  // POST /auth/verify
  const postAuthVerify = (body: AuthVerifyReqBody) => apiFetch<AuthVerifyOk>('/auth/verify', { method: 'POST', body })

  // GET /works
  const getWorks = (query?: GetWorksReqQuery) => apiFetch<GetWorksOk>('/works', { method: 'GET', query })

  // GET /works/{workId}
  const getWork = (workId: string) => apiFetch<GetWorkOk>(`/works/${workId}`)

  // GET /users/{userId}
  const getUser = (userId: string) => apiFetch<GetUserOk>(`/users/${userId}`)

  // ----------------------------------------------------------------
  // MARK: Private endpoints (requires authentication)
  // ----------------------------------------------------------------

  // POST /privateApiSample
  const postPrivateApiSample = () => authedApiFetch<PrivateApiSampleOk>('/privateApiSample', { method: 'POST' })

  // POST /works/uploads/init
  const postWorksUploadsInit = (body: WorksUploadsInitReqBody) =>
    authedApiFetch<WorksUploadsInitOk>('/works/uploads/init', { method: 'POST', body })

  // POST /works/uploads/finalize
  const postWorksUploadsFinalize = (body: WorksUploadsFinalizeReqBody) =>
    authedApiFetch<WorksUploadsFinalizeOk>('/works/uploads/finalize', { method: 'POST', body })

  return {
    getHealth,
    postAuthChallenge,
    postAuthVerify,
    getWorks,
    getWork,
    getUser,
    postPrivateApiSample,
    postWorksUploadsInit,
    postWorksUploadsFinalize,
  }
}
