import { describe, it, expect, afterEach } from 'vitest'
import { isAdminEmail } from '@/lib/auth/admin'

const ORIGINAL = process.env.ADMIN_EMAIL

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.ADMIN_EMAIL
  } else {
    process.env.ADMIN_EMAIL = ORIGINAL
  }
})

describe('isAdminEmail', () => {
  it('returns false when ADMIN_EMAIL env var is not set', () => {
    delete process.env.ADMIN_EMAIL
    expect(isAdminEmail('anyone@example.com')).toBe(false)
  })

  it('returns false when email is null', () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    expect(isAdminEmail(null)).toBe(false)
  })

  it('returns false when email is undefined', () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    expect(isAdminEmail(undefined)).toBe(false)
  })

  it('returns true when email exactly matches ADMIN_EMAIL', () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    expect(isAdminEmail('admin@example.com')).toBe(true)
  })

  it('returns true for a case-insensitive match', () => {
    process.env.ADMIN_EMAIL = 'Admin@App.Com'
    expect(isAdminEmail('admin@app.com')).toBe(true)
  })

  it('returns false when email does not match ADMIN_EMAIL', () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    expect(isAdminEmail('other@example.com')).toBe(false)
  })
})
