// Zero-knowledge vault crypto primitives (Web Crypto API only, no dependency).
// See ENCRYPTION.md for the key hierarchy and how this is used end-to-end.

export const DEFAULT_KDF_ITERATIONS = 600_000

const AES_ALGO = 'AES-GCM'
const AES_LENGTH = 256
const IV_BYTES = 12

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))
}

/** Derives the Key Encryption Key from the user's password. Only ever used to wrap/unwrap the DEK. */
export async function deriveKek(password: string, saltB64: string, iterations: number): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToBytes(saltB64) as BufferSource, iterations, hash: 'SHA-256' },
    passwordKey,
    { name: AES_ALGO, length: AES_LENGTH },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

/** Generates the Data Encryption Key — the real vault key that encrypts/decrypts everything. */
export function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: AES_ALGO, length: AES_LENGTH }, true, ['encrypt', 'decrypt'])
}

export type WrappedKey = { wrapped: string; iv: string }

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<WrappedKey> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: AES_ALGO, iv: iv as BufferSource })
  return { wrapped: bytesToBase64(new Uint8Array(wrapped)), iv: bytesToBase64(iv) }
}

/** Throws if `kek` is wrong (e.g. derived from an incorrect password) — AES-GCM is authenticated. */
export function unwrapDek(wrappedB64: string, ivB64: string, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBytes(wrappedB64) as BufferSource,
    kek,
    { name: AES_ALGO, iv: base64ToBytes(ivB64) as BufferSource },
    { name: AES_ALGO, length: AES_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  )
}

export type EncryptedBlob = { ciphertext: string; iv: string }

export async function encryptJson<T>(value: T, dek: CryptoKey): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: AES_ALGO, iv: iv as BufferSource }, dek, bytes)
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) }
}

export async function decryptJson<T>(ciphertext: string, iv: string, dek: CryptoKey): Promise<T> {
  const bytes = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv: base64ToBytes(iv) as BufferSource },
    dek,
    base64ToBytes(ciphertext) as BufferSource,
  )
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

/** Deterministic HMAC token for exact-match lookups (e.g. duplicate URL detection) without revealing the value. */
export async function hmacFingerprint(value: string, dek: CryptoKey): Promise<string> {
  const rawDek = await crypto.subtle.exportKey('raw', dek)
  const hmacKey = await crypto.subtle.importKey('raw', rawDek, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(signature))
}
