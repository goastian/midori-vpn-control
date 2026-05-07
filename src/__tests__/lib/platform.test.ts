import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  detectMobile,
  detectAppleSiliconViaWebGL,
  detectDesktopEnvironment,
} from '@/lib/platform'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockNavigator(overrides: Partial<Navigator> & { userAgentData?: unknown } = {}) {
  const base = {
    userAgent: '',
    platform: '',
    maxTouchPoints: 0,
    language: 'en',
    userAgentData: undefined,
    ...overrides,
  }
  Object.defineProperty(globalThis, 'navigator', { value: base, writable: true, configurable: true })
}

function mockSessionStorage() {
  const store: Record<string, string> = {}
  vi.spyOn(globalThis, 'sessionStorage', 'get').mockReturnValue({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    key: () => null,
    length: 0,
  } as Storage)
}

// ─── detectMobile ─────────────────────────────────────────────────────────────

describe('detectMobile', () => {
  it('returns true for iPhone UA', () => {
    expect(detectMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
  })

  it('returns true for Android UA', () => {
    expect(detectMobile('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36')).toBe(true)
  })

  it('returns true for iPad UA', () => {
    expect(detectMobile('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true)
  })

  it('returns true for iPadOS Safari (Mac UA + maxTouchPoints > 1)', () => {
    expect(detectMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
  })

  it('returns false for macOS desktop Safari (maxTouchPoints = 0)', () => {
    expect(detectMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
  })

  it('returns false for Windows Chrome', () => {
    expect(detectMobile('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 0)).toBe(false)
  })

  it('returns false for Linux Firefox', () => {
    expect(detectMobile('Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0', 0)).toBe(false)
  })
})

// ─── detectAppleSiliconViaWebGL ───────────────────────────────────────────────

describe('detectAppleSiliconViaWebGL', () => {
  it('returns true when UNMASKED_RENDERER is "Apple GPU"', () => {
    const mockExt = { UNMASKED_RENDERER_WEBGL: 0x9246 as number }
    const mockGl = {
      getExtension: () => mockExt,
      getParameter: (param: number) => param === mockExt.UNMASKED_RENDERER_WEBGL ? 'Apple GPU' : '',
    }
    const mockCanvas = { getContext: () => mockGl }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockCanvas as unknown as HTMLCanvasElement)
    expect(detectAppleSiliconViaWebGL()).toBe(true)
  })

  it('returns true when UNMASKED_RENDERER is "Apple M2"', () => {
    const mockExt = { UNMASKED_RENDERER_WEBGL: 0x9246 as number }
    const mockGl = {
      getExtension: () => mockExt,
      getParameter: () => 'Apple M2',
    }
    const mockCanvas = { getContext: () => mockGl }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockCanvas as unknown as HTMLCanvasElement)
    expect(detectAppleSiliconViaWebGL()).toBe(true)
  })

  it('returns false when UNMASKED_RENDERER is an Intel GPU', () => {
    const mockExt = { UNMASKED_RENDERER_WEBGL: 0x9246 as number }
    const mockGl = {
      getExtension: () => mockExt,
      getParameter: () => 'Intel(R) Iris(TM) Plus Graphics 640',
    }
    const mockCanvas = { getContext: () => mockGl }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockCanvas as unknown as HTMLCanvasElement)
    expect(detectAppleSiliconViaWebGL()).toBe(false)
  })

  it('returns false when WebGL extension is unavailable', () => {
    const mockGl = { getExtension: () => null }
    const mockCanvas = { getContext: () => mockGl }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockCanvas as unknown as HTMLCanvasElement)
    expect(detectAppleSiliconViaWebGL()).toBe(false)
  })

  it('returns false when getContext throws', () => {
    const mockCanvas = { getContext: () => { throw new Error('no WebGL') } }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockCanvas as unknown as HTMLCanvasElement)
    expect(detectAppleSiliconViaWebGL()).toBe(false)
  })
})

// ─── detectDesktopEnvironment ─────────────────────────────────────────────────

describe('detectDesktopEnvironment', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockSessionStorage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Windows 11 Edge — x64, detected', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
      platform: 'Win32',
      userAgentData: {
        platform: 'Windows',
        getHighEntropyValues: async () => ({ platform: 'Windows', architecture: 'x86', bitness: '64', mobile: false }),
      },
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('windows')
    expect(env.architecture).toBe('x64')
    expect(env.confidence).toBe('detected')
  })

  it('macOS Safari Intel — x64, uncertain (no userAgentData)', async () => {
    // Mock WebGL to return an Intel renderer to confirm Intel Mac
    const mockExt = { UNMASKED_RENDERER_WEBGL: 0x9246 as number }
    const mockGl = {
      getExtension: () => mockExt,
      getParameter: () => 'Intel(R) Iris Plus Graphics',
    }
    const mockCanvas = { getContext: () => mockGl }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

    mockNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('macos')
    expect(env.architecture).toBe('x64')
    expect(env.confidence).toBe('uncertain')
  })

  it('macOS Safari M1 — arm64 via WebGL, detected', async () => {
    const mockExt = { UNMASKED_RENDERER_WEBGL: 0x9246 as number }
    const mockGl = {
      getExtension: () => mockExt,
      getParameter: () => 'Apple GPU',
    }
    const mockCanvas = { getContext: () => mockGl }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

    mockNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('macos')
    expect(env.architecture).toBe('arm64')
    // Detected via WebGL fallback — confidence stays 'detected' for the OS
    expect(env.confidence).toBe('detected')
  })

  it('macOS Chrome arm64 via userAgentData — detected', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      platform: 'MacIntel',
      userAgentData: {
        platform: 'macOS',
        getHighEntropyValues: async () => ({ platform: 'macOS', architecture: 'arm', bitness: '64', mobile: false }),
      },
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('macos')
    expect(env.architecture).toBe('arm64')
    expect(env.confidence).toBe('detected')
  })

  it('iPadOS Safari — mobile, hide download section', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.confidence).toBe('mobile')
  })

  it('Android Chrome — mobile', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      platform: 'Linux aarch64',
      maxTouchPoints: 5,
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.confidence).toBe('mobile')
  })

  it('Linux Ubuntu Firefox — deb, detected', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
      platform: 'Linux x86_64',
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('linux')
    expect(env.linuxPackageFormat).toBe('deb')
    expect(env.confidence).toBe('detected')
  })

  it('Linux Fedora — rpm, detected', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
      platform: 'Linux x86_64',
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('linux')
    expect(env.linuxPackageFormat).toBe('rpm')
  })

  it('Linux generic (no distro token) — uncertain, no primary', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
      platform: 'Linux x86_64',
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('linux')
    expect(env.linuxPackageFormat).toBe('unknown')
    expect(env.confidence).toBe('uncertain')
  })

  it('ChromeOS — linux platform detected', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14268.67.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.111 Safari/537.36',
      platform: 'Linux x86_64',
      userAgentData: undefined,
    })
    const env = await detectDesktopEnvironment()
    expect(env.platform).toBe('linux')
  })

  it('returns cached result on second call without re-detecting', async () => {
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'Win32',
      userAgentData: undefined,
    })
    const first = await detectDesktopEnvironment()
    // Change navigator to something different — should still get cached result
    mockNavigator({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
      platform: 'Linux aarch64',
      maxTouchPoints: 5,
      userAgentData: undefined,
    })
    const second = await detectDesktopEnvironment()
    expect(second.platform).toBe(first.platform)
  })
})
