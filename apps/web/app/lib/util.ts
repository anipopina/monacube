// utilities for frontend

import { FetchError } from 'ofetch'
import { workId2imageKey } from '@shared/const'

export const CSS_TOKENS = {
  // 検索で影響範囲に気付きやすいようにCSSトークン名をそのままキーにする
  '--duration-fast': 120,
  '--duration-normal': 200,
  '--duration-slow': 300,
  '--duration-veryslow': 1000,
  '--duration-tooltip': 3000,
  '--duration-toast': 5000,
}

export const formatBalance = (balance: number, accurate: boolean = false): string => {
  // show 4 decimal places
  // if balance is less than 0.01, show 8 decimal places
  const digits = accurate || balance < 0.01 ? 8 : 4
  const formatted = balance.toFixed(digits)
  // add ',' as thousand separator
  // remove trailing zeros after decimal point
  let [beforeDot = '', afterDot = ''] = formatted.split('.')
  beforeDot = beforeDot.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  afterDot = afterDot.replace(/0+$/, '')
  return afterDot ? `${beforeDot}.${afterDot}` : beforeDot
}

export const formatIsoDate = (iso: string, locale: string = 'ja-JP'): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const normalizeStringArray = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map((v) => String(v)).filter(Boolean)
  if (raw instanceof Set) return [...raw].map((v) => String(v)).filter(Boolean)
  return []
}

export const getHttpErrorStatusCode = (error: unknown): number | undefined => {
  if (error instanceof FetchError) return normalizeStatus(error.status)
  if (!error || typeof error !== 'object') return undefined

  const e = error as Record<string, unknown>
  const direct = normalizeStatus(e.statusCode) ?? normalizeStatus(e.status)
  if (direct) return direct

  const cause = e.cause
  if (cause && typeof cause === 'object') {
    const c = cause as Record<string, unknown>
    return normalizeStatus(c.statusCode) ?? normalizeStatus(c.status)
  }

  return undefined
}

export const workImageUrl = (imgBase: string, workId: string, size: 'original' | 'large' | 'medium' | 'thumb'): string => {
  return `${imgBase}/${workId2imageKey(workId, size)}`
}

const normalizeStatus = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(n) && n >= 400 && n <= 599 ? n : undefined
}
