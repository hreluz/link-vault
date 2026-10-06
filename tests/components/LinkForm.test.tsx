// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
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

// jsdom doesn't turn a plain Enter keypress into a form submit the way a browser does,
// so these tests submit the form directly; Enter itself is checked in a real browser.
describe('LinkForm submit', () => {
  it('puts the fields inside a form, with Save as its submit button', () => {
    renderForm()
    const form = screen.getByLabelText('Title').closest('form')
    expect(form).not.toBeNull()
    expect(form!.noValidate).toBe(true)
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save.getAttribute('type')).toBe('submit')
    expect(form!.contains(save)).toBe(true)
  })

  it('calls onSubmit once when the form is submitted', () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    fireEvent.submit(screen.getByLabelText('Title').closest('form')!)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('calls onSubmit when Save is clicked', () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it.each<[string, Partial<LinkFormContextValue>]>([
    ['nothing has changed in Edit', { hasChanges: false }],
    ['the URL is empty', { url: '  ' }],
    ['a save is already running', { submitting: true }],
    ['the discard prompt is showing', { discardPrompt: { onKeepEditing: vi.fn(), onDiscard: vi.fn() } }],
  ])('does not call onSubmit when %s', (_, overrides) => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit, ...overrides })
    fireEvent.submit(screen.getByLabelText('Title').closest('form')!)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each([['metaKey'], ['ctrlKey']])('submits on Enter with %s held in Notes', (modifier) => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    fireEvent.keyDown(screen.getByLabelText('Notes'), { key: 'Enter', [modifier]: true })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not submit on plain Enter in Notes', () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    fireEvent.keyDown(screen.getByLabelText('Notes'), { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit on Cmd+Enter when nothing has changed', () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit, hasChanges: false })
    fireEvent.keyDown(screen.getByLabelText('Notes'), { key: 'Enter', metaKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
