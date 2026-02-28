function dec2hex(dec: number): string {
  return ('0' + dec.toString(16)).substr(-2)
}

export function generateRandomString(length: number): string {
  const array = new Uint32Array(length / 2)
  crypto.getRandomValues(array)
  return Array.from(array, dec2hex).join('')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function base64urlEncode(buffer: ArrayBuffer): string {
  let str = ''
  const bytes = new Uint8Array(buffer)
  for (const byte of bytes) {
    str += String.fromCharCode(byte)
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier)
  return base64urlEncode(hashed)
}

export function generateCodeVerifier(): string {
  return generateRandomString(128)
}
