const API_URL = import.meta.env.VITE_API_URL || ''

interface ApiResponse<T = any> {
  ok: boolean
  data: T
  error?: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  if (res.status === 401) {
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
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export async function exchangeCode(code: string, redirectUri: string, codeVerifier: string) {
  const res = await fetch(`${API_URL}/auth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'token exchange failed' }))
    throw new Error(err.error || 'token exchange failed')
  }

  const json = await res.json()
  return json.data as {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
    id_token?: string
  }
}
