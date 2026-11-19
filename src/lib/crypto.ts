/**
 * Client-Side Curve25519 (X25519) Keypair Generator using WebCrypto API
 * Ensures private keys NEVER leave the browser or touch the backend server.
 */

export interface Keypair {
  publicKey: string
  privateKey: string
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Generates an X25519 Curve25519 keypair in-memory.
 */
export async function generateClientKeypair(): Promise<Keypair> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('WebCrypto API is not supported in this browser')
  }

  try {
    // Generate native X25519 keypair
    const keyPair = (await window.crypto.subtle.generateKey(
      {
        name: 'X25519',
      },
      true,
      ['deriveKey', 'deriveBits']
    )) as CryptoKeyPair

    // Export raw key bytes
    const rawPublicKey = await window.crypto.subtle.exportKey('raw', keyPair.publicKey)
    const pkcs8PrivateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    // WireGuard expects 32-byte raw curve25519 private key.
    // In PKCS#8 format for X25519, the last 32 bytes contain the raw private key.
    const privBytes = new Uint8Array(pkcs8PrivateKey)
    const rawPrivateKey = privBytes.slice(privBytes.length - 32)

    return {
      publicKey: arrayBufferToBase64(rawPublicKey),
      privateKey: arrayBufferToBase64(rawPrivateKey.buffer),
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error'
    throw new Error(`WebCrypto X25519 key generation failed: ${detail}`)
  }
}
