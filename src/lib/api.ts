const API_URL = import.meta.env.VITE_API_URL || ''

import type { ZodType } from 'zod'

interface ApiResponse<T = any> {
  ok: boolean
  data: T
  error?: string
}

let isRefreshing = false
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: Error) => void }> = []

function processRefreshQueue(error: Error | null, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  refreshQueue = []
}

async function tryRefreshToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    throw new Error('Token refresh failed')
  }

  const json: ApiResponse<{ access_token: string; refresh_token?: string }> = await res.json()
  if (!json.ok || !json.data?.access_token) {
    throw new Error('Invalid refresh response')
  }

  localStorage.setItem('access_token', json.data.access_token)
  if (json.data.refresh_token) {
    localStorage.setItem('refresh_token', json.data.refresh_token)
  }

  return json.data.access_token
}

async function request<T>(path: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
  const token = localStorage.getItem('access_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && !_isRetry) {
    // Attempt token refresh
    if (!isRefreshing) {
      isRefreshing = true
      try {
        const newToken = await tryRefreshToken()
        isRefreshing = false
        processRefreshQueue(null, newToken)
        // Retry original request with new token
        return request<T>(path, options, true)
      } catch (err) {
        isRefreshing = false
        processRefreshQueue(err as Error, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }
    } else {
      // Another refresh is in progress — wait for it
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push({
          resolve: () => resolve(request<T>(path, options, true)),
          reject,
        })
      })
    }
  }

  if (res.status === 401 && _isRetry) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const json: ApiResponse<T> = await res.json()

  if (!res.ok || json.error) {
    throw new Error(json.error || `Request failed: ${res.status}`)
  }

  return json.data
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Type-safe request with Zod schema validation on the response. */
  validated: <T>(path: string, schema: ZodType<T>, options?: RequestInit) =>
    request<unknown>(path, options).then((data) => schema.parse(data)),
}

import { TokenResponseSchema } from './schemas'

export async function exchangeCode(code: string, redirectUri: string, codeVerifier: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'token exchange failed' }))
    throw new Error(err.error || 'token exchange failed')
  }

  const json = await res.json()
  return TokenResponseSchema.parse(json.data)
}
