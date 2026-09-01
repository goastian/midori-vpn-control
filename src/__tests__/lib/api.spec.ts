import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIError, api, clearAccessToken } from '../../lib/api'

describe('API errors', () => {
  beforeEach(() => {
    clearAccessToken()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('preserves the stable backend code and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: 'The account quota is exhausted',
      code: 'device_limit_reached',
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })))

    const failure = api.get('/api/v1/control/connections')
    await expect(failure).rejects.toBeInstanceOf(APIError)
    await expect(failure).rejects.toMatchObject({
      status: 409,
      code: 'device_limit_reached',
      message: 'The account quota is exhausted',
    })
  })
})
