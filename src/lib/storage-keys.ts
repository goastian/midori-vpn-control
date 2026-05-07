/**
 * Centralized sessionStorage / localStorage key names.
 *
 * Keep all client-side storage keys here so that the auth store can
 * reliably purge sensitive material (e.g. WireGuard private keys) on
 * logout without each consumer having to register itself.
 */

/** Map of peer-id → WireGuard private key. Lives in sessionStorage only. */
export const PRIVATE_KEYS_STORAGE_KEY = 'midori-private-keys-by-peer'

/**
 * All sessionStorage keys that hold authenticated-user material.
 * `logout()` in `stores/auth.ts` iterates this list to wipe them.
 *
 * Do NOT include non-sensitive caches here (e.g. platform detection
 * cache in `lib/platform.ts`); they survive logout intentionally.
 */
export const SENSITIVE_SESSION_KEYS: readonly string[] = [
  PRIVATE_KEYS_STORAGE_KEY,
] as const
