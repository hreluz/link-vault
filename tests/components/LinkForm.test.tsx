// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import LinkForm from '@/app/dashboard/link/LinkForm'
import { LinkFormContext } from '@/app/dashboard/link/LinkFormContext'
import type { LinkFormContextValue } from '@/app/dashboard/link/LinkFormContext'
import type { Category } from '@/lib/services/categories'

vi.mock('@/lib/hooks/tags/useAvailableTags', () => ({
  useAvailableTags: () => [],
}))

afterEach(() => {
  cleanup()
})

function makeContext(overrides: Partial<LinkFormContextValue> = {}): LinkFormContextValue {
  return {
    mode: 'edit',
    url: 'https://example.com',
    setUrl: vi.fn(),
    title: '',
    setTitle: vi.fn(),
    description: '',
    setDescription: vi.fn(),
    imageUrl: '',
    setImageUrl: vi.fn(),
    duration: '',
    setDuration: vi.fn(),
    fetchingMeta: false,
    categoryId: 'cat-1',
    setCategoryId: vi.fn(),
    status: 'unread',
    setStatus: vi.fn(),
    tags: '',
    setTags: vi.fn(),
    notes: '',
    setNotes: vi.fn(),
    submitting: false,
    error: null,
    categories: [{ id: 'cat-1', name: 'YouTube', emoticon: '📺' } as Category],
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    submitLabel: 'Save changes',
    ...overrides,
  }
}

function renderForm(overrides: Partial<LinkFormContextValue> = {}, collapsible = false) {
  return render(
    <LinkFormContext.Provider value={makeContext(overrides)}>
      <LinkForm scrollable collapsible={collapsible} />
    </LinkFormContext.Provider>,
  )
}

describe('LinkForm labels', () => {
  it.each([
    ['URL', 'INPUT'],
    ['Title', 'INPUT'],
    ['Description', 'TEXTAREA'],
    ['Category', 'SELECT'],
    ['Status', 'SELECT'],
    ['Tags', 'INPUT'],
    ['Duration', 'INPUT'],
    ['Notes', 'TEXTAREA'],
  ])('connects the %s label to its field in edit mode', (label, tagName) => {
    renderForm()
    expect(screen.getByLabelText(label).tagName).toBe(tagName)
  })

  it('connects the URL label in the collapsed add form', () => {
    renderForm({ mode: 'add', url: '' }, true)
    expect(screen.getByLabelText('URL').tagName).toBe('INPUT')
  })
})
