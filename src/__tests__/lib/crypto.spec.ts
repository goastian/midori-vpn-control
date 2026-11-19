import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateClientKeypair } from '@/lib/crypto'

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

describe('generateClientKeypair', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports a native X25519 keypair without sending or persisting the private key', async () => {
    const publicBytes = Uint8Array.from({ length: 32 }, (_, index) => index)
    const privateBytes = Uint8Array.from({ length: 32 }, (_, index) => 255 - index)
    const pkcs8Bytes = new Uint8Array(16 + privateBytes.length)
    pkcs8Bytes.set(privateBytes, 16)
    const keyPair = {
      publicKey: {} as CryptoKey,
      privateKey: {} as CryptoKey,
    }

    const generateKey = vi.spyOn(window.crypto.subtle, 'generateKey').mockResolvedValue(keyPair)
    const exportKey = vi.spyOn(window.crypto.subtle, 'exportKey').mockImplementation(async (format) => {
      return format === 'raw' ? publicBytes.buffer : pkcs8Bytes.buffer
    })
    const randomFallback = vi.spyOn(window.crypto, 'getRandomValues')

    await expect(generateClientKeypair()).resolves.toEqual({
      publicKey: base64(publicBytes),
      privateKey: base64(privateBytes),
    })
    expect(generateKey).toHaveBeenCalledWith({ name: 'X25519' }, true, ['deriveKey', 'deriveBits'])
    expect(exportKey).toHaveBeenNthCalledWith(1, 'raw', keyPair.publicKey)
    expect(exportKey).toHaveBeenNthCalledWith(2, 'pkcs8', keyPair.privateKey)
    expect(randomFallback).not.toHaveBeenCalled()
  })

  it('fails closed when native X25519 generation is unavailable', async () => {
    vi.spyOn(window.crypto.subtle, 'generateKey').mockRejectedValue(new Error('not supported'))
    const randomFallback = vi.spyOn(window.crypto, 'getRandomValues')

    await expect(generateClientKeypair()).rejects.toThrow(
      'WebCrypto X25519 key generation failed: not supported',
    )
    expect(randomFallback).not.toHaveBeenCalled()
  })
})
