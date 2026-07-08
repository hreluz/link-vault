import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'))
}

describe('proxy', () => {
  it('redirects unauthenticated /dashboard requests to /login with no extra params', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await proxy(makeRequest('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('redirects unauthenticated /dashboard?add=1&url=&title= to /login with capturedUrl/capturedTitle only', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await proxy(makeRequest('/dashboard?add=1&url=https%3A%2F%2Fexample.com&title=Example'))

    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('capturedUrl')).toBe('https://example.com')
    expect(location.searchParams.get('capturedTitle')).toBe('Example')
    expect(location.searchParams.get('add')).toBeNull()
    expect(location.searchParams.get('url')).toBeNull()
  })

  it('does not add capturedUrl/capturedTitle when add is not exactly "1"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await proxy(makeRequest('/dashboard?add=true&url=https%3A%2F%2Fexample.com'))

    const location = new URL(response.headers.get('location')!)
    expect(location.searchParams.get('capturedUrl')).toBeNull()
  })

  it('passes through unauthenticated non-dashboard routes without redirecting to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await proxy(makeRequest('/'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('lets an authenticated /dashboard?add=1 request through unchanged', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const response = await proxy(makeRequest('/dashboard?add=1&url=https%3A%2F%2Fexample.com&title=Example'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects an authenticated user away from /login to /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const response = await proxy(makeRequest('/login'))

    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })
})
