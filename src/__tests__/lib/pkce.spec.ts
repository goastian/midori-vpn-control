import { describe, it, expect } from 'vitest'
import { generateCodeVerifier, generateCodeChallenge, generateRandomString } from '@/lib/pkce'

describe('PKCE utilities', () => {
  describe('generateRandomString', () => {
    it('generates a string of the expected length', () => {
      const str = generateRandomString(64)
      // Each pair of hex chars = 2 chars, so 64/2 pairs = 64 chars
      expect(str.length).toBe(64)
    })

    it('generates different strings on consecutive calls', () => {
      const a = generateRandomString(64)
      const b = generateRandomString(64)
      expect(a).not.toBe(b)
    })

    it('only contains hex characters', () => {
      const str = generateRandomString(128)
      expect(str).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('generateCodeVerifier', () => {
    it('returns a 128-char hex string', () => {
      const verifier = generateCodeVerifier()
      expect(verifier.length).toBe(128)
      expect(verifier).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('generateCodeChallenge', () => {
    it('returns a non-empty base64url string', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      expect(challenge.length).toBeGreaterThan(0)
      // Base64url chars only (no +, /, =)
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('produces different challenges for different verifiers', async () => {
      const v1 = generateCodeVerifier()
      const v2 = generateCodeVerifier()
      const c1 = await generateCodeChallenge(v1)
      const c2 = await generateCodeChallenge(v2)
      expect(c1).not.toBe(c2)
    })

    it('produces the same challenge for the same verifier', async () => {
      const verifier = 'test-verifier-fixed'
      const c1 = await generateCodeChallenge(verifier)
      const c2 = await generateCodeChallenge(verifier)
      expect(c1).toBe(c2)
    })
  })
})
