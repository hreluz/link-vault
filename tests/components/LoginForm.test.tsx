// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import LoginForm from '@/app/(auth)/login/LoginForm'

const { mockLoginAction, mockUnlock, mockPush, mockParams } = vi.hoisted(() => ({
  mockLoginAction: vi.fn(),
  mockUnlock: vi.fn(),
  mockPush: vi.fn(),
  mockParams: new URLSearchParams(),
}))

vi.mock('@/app/(auth)/login/actions', () => ({ loginAction: mockLoginAction }))

vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ unlock: mockUnlock }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockParams,
}))

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Array.from(mockParams.keys())) mockParams.delete(key)
  mockLoginAction.mockResolvedValue({ success: true })
  mockUnlock.mockResolvedValue({ status: 'unlocked', dek: {} })
})

afterEach(() => {
  cleanup()
})

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('LoginForm', () => {
  it('redirects to a bare /dashboard when there is no captured link', async () => {
    render(<LoginForm />)

    await fillAndSubmit()

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'))
  })

  it('resumes a captured bookmarklet link after login', async () => {
    mockParams.set('capturedUrl', 'https://example.com/article')
    mockParams.set('capturedTitle', 'Example Article')

    render(<LoginForm />)

    await fillAndSubmit()

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/dashboard?add=1&url=https%3A%2F%2Fexample.com%2Farticle&title=Example%20Article'
      )
    )
  })

  it('does not redirect when the vault fails to unlock', async () => {
    mockUnlock.mockResolvedValue({ status: 'wrong_password', dek: null })

    render(<LoginForm />)

    await fillAndSubmit()

    await screen.findByText('Could not unlock your vault. Please try again.')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('links to /restart-account for a forgotten password', () => {
    render(<LoginForm />)

    const link = screen.getByRole('link', { name: /restart account/i })
    expect(link.getAttribute('href')).toBe('/restart-account')
  })
})
