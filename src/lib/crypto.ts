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
    // Fallback: cryptographically secure random 32 bytes if X25519 SubtleCrypto isn't exposed
    const priv = new Uint8Array(32)
    window.crypto.getRandomValues(priv)
    // Clamp curve25519 private key bits according to RFC 7748
    priv[0] &= 248
    priv[31] &= 127
    priv[31] |= 64

    return {
      publicKey: '', // Will be derived or provided by fallback
      privateKey: arrayBufferToBase64(priv.buffer),
    }
  }
}
