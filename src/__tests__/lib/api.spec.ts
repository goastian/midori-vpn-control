import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIError, api, clearAccessToken } from '../../lib/api'
import { UserQuotaSchema } from '../../lib/schemas'

describe('API errors', () => {
  beforeEach(() => {
    clearAccessToken()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('preserves the stable backend code and status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: 'The account quota is exhausted',
            code: 'device_limit_reached',
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    const failure = api.get('/api/v1/control/connections')
    await expect(failure).rejects.toBeInstanceOf(APIError)
    await expect(failure).rejects.toMatchObject({
      status: 409,
      code: 'device_limit_reached',
      message: 'The account quota is exhausted',
    })
  })

  it('preserves Retry-After for a pending device cleanup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: 'Device cleanup did not converge',
            code: 'device_cleanup_pending',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
          },
        ),
      ),
    )

    await expect(api.delete('/api/v1/control/devices/device-1')).rejects.toMatchObject({
      status: 503,
      code: 'device_cleanup_pending',
      retryAfter: 5,
    })
  })

  it('rejects successful responses whose rendered data violates its schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              connected_devices: 1,
              max_devices: 5,
              plan_slug: 'standard',
              plan_name: 'Standard',
              devices_by_type: { desktop: 1, extension: 0, wireguard: 0 },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(api.validated('/api/v1/control/quota', UserQuotaSchema)).rejects.toMatchObject({
      name: 'ZodError',
    })
  })
})
