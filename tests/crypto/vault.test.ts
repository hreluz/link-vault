import { describe, it, expect } from 'vitest'
import {
  generateSalt, deriveKek, generateDek, wrapDek, unwrapDek,
  encryptJson, decryptJson, hmacFingerprint, DEFAULT_KDF_ITERATIONS,
} from '@/lib/crypto/vault'

describe('vault crypto', () => {
  it('wraps and unwraps the DEK with the correct password', async () => {
    const salt = generateSalt()
    const kek = await deriveKek('correct-horse-battery-staple', salt, DEFAULT_KDF_ITERATIONS)
    const dek = await generateDek()

    const { wrapped, iv } = await wrapDek(dek, kek)
    const unwrapped = await unwrapDek(wrapped, iv, kek)

    const original = await encryptJson({ hello: 'world' }, dek)
    const roundTripped = await decryptJson(original.ciphertext, original.iv, unwrapped)
    expect(roundTripped).toEqual({ hello: 'world' })
  })

  it('fails to unwrap the DEK with the wrong password', async () => {
    const salt = generateSalt()
    const correctKek = await deriveKek('correct-password', salt, DEFAULT_KDF_ITERATIONS)
    const wrongKek = await deriveKek('wrong-password', salt, DEFAULT_KDF_ITERATIONS)
    const dek = await generateDek()

    const { wrapped, iv } = await wrapDek(dek, correctKek)

    await expect(unwrapDek(wrapped, iv, wrongKek)).rejects.toThrow()
  })

  it('encrypts and decrypts a JSON payload round-trip', async () => {
    const dek = await generateDek()
    const payload = { title: 'Understanding Kubernetes Networking', url: 'https://example.com/blog/k8s-networking' }

    const { ciphertext, iv } = await encryptJson(payload, dek)
    expect(ciphertext).not.toContain('Kubernetes')

    const decrypted = await decryptJson<typeof payload>(ciphertext, iv, dek)
    expect(decrypted).toEqual(payload)
  })

  it('fails to decrypt with a different DEK', async () => {
    const dek = await generateDek()
    const otherDek = await generateDek()

    const { ciphertext, iv } = await encryptJson({ a: 1 }, dek)

    await expect(decryptJson(ciphertext, iv, otherDek)).rejects.toThrow()
  })

  it('produces a deterministic fingerprint for the same value and key', async () => {
    const dek = await generateDek()

    const a = await hmacFingerprint('https://example.com/abc', dek)
    const b = await hmacFingerprint('https://example.com/abc', dek)
    const c = await hmacFingerprint('https://example.com/xyz', dek)

    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[0-9a-f]+$/)
  })

  it('produces different fingerprints for the same value under different keys', async () => {
    const dekA = await generateDek()
    const dekB = await generateDek()

    const a = await hmacFingerprint('https://example.com/abc', dekA)
    const b = await hmacFingerprint('https://example.com/abc', dekB)

    expect(a).not.toBe(b)
  })
})
