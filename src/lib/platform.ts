/**
 * Platform detection utilities for the desktop client download section.
 *
 * Strategy (priority order):
 *   1. `navigator.userAgentData.getHighEntropyValues()` — most accurate, Chromium 90+.
 *   2. WebGL UNMASKED_RENDERER — detects Apple Silicon on Safari (where UA still says Intel).
 *   3. Legacy `navigator.userAgent` / `navigator.platform` — universal fallback.
 *
 * Confidence levels control whether a "Recommended" badge is shown:
 *   - 'detected'  — high-confidence signal; mark one option as primary.
 *   - 'uncertain' — low-confidence; show all options without a primary.
 *   - 'mobile'    — device is a phone/tablet; hide the download section entirely.
 *   - 'unknown'   — no OS detected at all; show all options without a primary.
 */

export type DesktopPlatform = 'windows' | 'macos' | 'linux' | 'unknown'
export type Architecture = 'x64' | 'arm64' | 'unknown'
export type LinuxPackageFormat = 'deb' | 'rpm' | 'unknown'
export type DetectionConfidence = 'detected' | 'uncertain' | 'mobile' | 'unknown'

export interface DesktopEnvironment {
  platform: DesktopPlatform
  architecture: Architecture
  linuxPackageFormat: LinuxPackageFormat
  confidence: DetectionConfidence
}

// Session-storage cache key to avoid re-running the WebGL heuristic on every mount.
const CACHE_KEY = 'midori.platform.v1'

interface NavigatorWithUAData extends Navigator {
  userAgentData?: NavigatorUAData
}

interface NavigatorUAData {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<UADataValues>
}

interface UADataValues {
  platform?: string
  architecture?: string
  bitness?: string
  mobile?: boolean
  model?: string
}

// ─── Mobile detection ──────────────────────────────────────────────────────

/**
 * Returns true if the current device is a mobile/tablet.
 * Handles iPadOS Safari which reports itself as macOS but has maxTouchPoints > 1.
 */
export function detectMobile(ua: string, maxTouchPoints = 0): boolean {
  // Explicit mobile UA tokens
  if (/android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return true
  // iPadOS Safari masquerades as macOS desktop UA, but has touch
  if (/ipad/i.test(ua)) return true
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return true
  return false
}

// ─── Apple Silicon via WebGL ───────────────────────────────────────────────

/**
 * Creates an off-DOM WebGL context and reads UNMASKED_RENDERER_WEBGL.
 * Returns true when the renderer string suggests Apple Silicon (contains "Apple"
 * but is NOT an Intel/AMD/NVIDIA GPU, which would indicate an Intel Mac with
 * Apple-branded discrete card wording).
 */
export function detectAppleSiliconViaWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return false

    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return false

    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
    if (!renderer) return false

    const r = renderer.toLowerCase()
    // Apple Silicon GPU shows "Apple GPU" or "Apple M1/M2/M3…"
    if (!/apple/.test(r)) return false
    // Exclude "Apple" appearing next to third-party GPU brands (shouldn't happen, but be safe)
    if (/intel|amd|nvidia|radeon|geforce/.test(r)) return false

    return true
  } catch {
    return false
  }
}

// ─── High-entropy values via userAgentData ─────────────────────────────────

async function getHighEntropyValues(): Promise<UADataValues | null> {
  try {
    const nav = navigator as NavigatorWithUAData
    if (!nav.userAgentData?.getHighEntropyValues) return null
    return await nav.userAgentData.getHighEntropyValues([
      'architecture',
      'bitness',
      'platform',
      'platformVersion',
      'mobile',
    ])
  } catch {
    return null
  }
}

// ─── Linux distro heuristics ───────────────────────────────────────────────

const DEB_TOKENS = /debian|ubuntu|mint|pop!?[\s_-]?os|kali|elementary|zorin|raspbian|linuxmint/i
const RPM_TOKENS = /fedora|rhel|red\s*hat|centos|rocky|alma|opensuse|suse/i

function detectLinuxFormat(source: string): LinuxPackageFormat {
  if (RPM_TOKENS.test(source)) return 'rpm'
  if (DEB_TOKENS.test(source)) return 'deb'
  return 'unknown'
}

// ─── Main async detector ───────────────────────────────────────────────────

/**
 * Detects the current desktop OS environment.
 * Results are cached in sessionStorage for the lifetime of the tab.
 */
export async function detectDesktopEnvironment(): Promise<DesktopEnvironment> {
  // Check cache first
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as DesktopEnvironment
      if (parsed.platform && parsed.confidence) return parsed
    }
  } catch {
    // sessionStorage unavailable (e.g. private mode restrictions) — continue
  }

  const ua = navigator.userAgent || ''
  const maxTouchPoints = navigator.maxTouchPoints ?? 0

  // ── Mobile check first ──────────────────────────────────────────────────
  if (detectMobile(ua, maxTouchPoints)) {
    const result: DesktopEnvironment = {
      platform: 'unknown',
      architecture: 'unknown',
      linuxPackageFormat: 'unknown',
      confidence: 'mobile',
    }
    cacheResult(result)
    return result
  }

  // ── Try high-entropy userAgentData ────────────────────────────────────
  const heValues = await getHighEntropyValues()

  const nav = navigator as NavigatorWithUAData
  const uaPlatformLegacy = nav.userAgentData?.platform || navigator.platform || ''
  const platformSource = `${heValues?.platform ?? ''} ${uaPlatformLegacy} ${ua}`.toLowerCase()
  const archSource = `${heValues?.architecture ?? ''} ${heValues?.bitness ?? ''} ${uaPlatformLegacy} ${ua}`.toLowerCase()

  // ── Detect OS ─────────────────────────────────────────────────────────
  let platform: DesktopPlatform = 'unknown'
  let confidence: DetectionConfidence = 'unknown'

  if (/windows|win32|win64/.test(platformSource)) {
    platform = 'windows'
    confidence = 'detected'
  } else if (/macintosh|mac os x|macos|darwin/.test(platformSource)) {
    platform = 'macos'
    confidence = 'detected'
  } else if (/linux|x11|ubuntu|fedora|debian|cros/.test(platformSource)) {
    platform = 'linux'
    confidence = 'detected'
  }

  // ── Detect architecture ───────────────────────────────────────────────
  let architecture: Architecture = 'unknown'

  if (platform === 'macos') {
    if (heValues?.architecture && /arm/.test(heValues.architecture.toLowerCase())) {
      // userAgentData explicitly says ARM → Apple Silicon
      architecture = 'arm64'
    } else if (/arm64|aarch64/.test(archSource)) {
      architecture = 'arm64'
    } else if (detectAppleSiliconViaWebGL()) {
      // Safari on M-chip: UA says Intel, WebGL renderer says "Apple GPU"
      architecture = 'arm64'
    } else if (/x86_64|x64|intel|amd64/.test(archSource)) {
      architecture = 'x64'
      // Intel Mac confirmed but not via high-entropy → mark uncertain so no auto-primary
      if (!heValues?.architecture) confidence = 'uncertain'
    } else {
      // No clear signal — show both DMGs without recommending one
      confidence = 'uncertain'
    }
  } else if (platform === 'windows') {
    if (/arm64|aarch64/.test(archSource)) {
      // No Windows ARM64 build available; keep architecture unknown
      architecture = 'unknown'
      confidence = 'uncertain'
    } else if (/x86_64|win64|x64|amd64|wow64|64/.test(archSource) || heValues?.bitness === '64') {
      architecture = 'x64'
    } else {
      architecture = 'x64' // default to x64 for Windows (virtually all modern systems)
    }
  } else if (platform === 'linux') {
    if (/arm64|aarch64/.test(archSource)) {
      architecture = 'arm64'
    } else {
      architecture = 'x64'
    }
  }

  // ── Linux distro format ───────────────────────────────────────────────
  let linuxPackageFormat: LinuxPackageFormat = 'unknown'
  if (platform === 'linux') {
    linuxPackageFormat = detectLinuxFormat(platformSource)
    // Only mark detected if we have an explicit distro signal
    if (linuxPackageFormat === 'unknown') {
      confidence = 'uncertain'
    }
  }

  const result: DesktopEnvironment = { platform, architecture, linuxPackageFormat, confidence }
  cacheResult(result)
  return result
}

function cacheResult(result: DesktopEnvironment): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result))
  } catch {
    // ignore
  }
}
