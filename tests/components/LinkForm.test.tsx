// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import LinkForm from '@/app/dashboard/link/LinkForm'
import { useDialog } from '@/lib/hooks/shared/useDialog'
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

function comesBefore(a: HTMLElement, b: HTMLElement) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe('LinkForm Tags placement', () => {
  it('shows the Tags and Title inputs in the collapsed add form', () => {
    renderForm({ mode: 'add', url: '' }, true)
    expect(screen.getByLabelText('Tags').tagName).toBe('INPUT')
    expect(screen.getByLabelText('Title').tagName).toBe('INPUT')
    expect(comesBefore(screen.getByLabelText('Tags'), screen.getByLabelText('Title'))).toBe(true)
    expect(screen.queryByLabelText('Description')).toBeNull()
  })

  it('keeps a single Tags input above a single Title once the add form is expanded', () => {
    renderForm({ mode: 'add', url: '' }, true)
    fireEvent.click(screen.getByRole('button', { name: 'More options' }))
    expect(screen.getAllByLabelText('Tags')).toHaveLength(1)
    expect(screen.getAllByLabelText('Title')).toHaveLength(1)
    expect(comesBefore(screen.getByLabelText('Tags'), screen.getByLabelText('Title'))).toBe(true)
  })

  it('places Tags between URL and Title in the edit form', () => {
    renderForm()
    const tags = screen.getByLabelText('Tags')
    expect(comesBefore(screen.getByLabelText('URL'), tags)).toBe(true)
    expect(comesBefore(tags, screen.getByLabelText('Title'))).toBe(true)
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

describe('LinkForm error message', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    // jsdom doesn't implement scrollIntoView.
    Element.prototype.scrollIntoView = scrollIntoView
  })

  function rerenderWith(rerender: (ui: React.ReactElement) => void, overrides: Partial<LinkFormContextValue>) {
    rerender(
      <LinkFormContext.Provider value={makeContext(overrides)}>
        <LinkForm scrollable />
      </LinkFormContext.Provider>,
    )
  }

  it('keeps an empty live region in place before any error', () => {
    const { container } = renderForm()
    const region = container.querySelector('[aria-live="polite"]')
    expect(region).not.toBeNull()
    expect(region!.textContent).toBe('')
  })

  it('shows a new error inside the live region that was already there', () => {
    const { container, rerender } = renderForm()
    const region = container.querySelector('[aria-live="polite"]')
    rerenderWith(rerender, { error: 'Failed to update link.' })
    expect(container.querySelector('[aria-live="polite"]')).toBe(region)
    expect(region!.textContent).toBe('Failed to update link.')
  })

  it('scrolls the error into view only once there is one', () => {
    const { rerender } = renderForm()
    expect(scrollIntoView).not.toHaveBeenCalled()
    rerenderWith(rerender, { error: 'Category is required.' })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })
})

// The form inside a dialog panel, the way EditLinkModal/AddLinkModal mount it.
function DialogForm({ ctx }: { ctx: LinkFormContextValue }) {
  const dialog = useDialog({ isOpen: true, onClose: () => {} })
  return (
    <div {...dialog.dialogProps} data-testid="panel">
      <h2 id={dialog.titleId}>Dialog</h2>
      <LinkFormContext.Provider value={ctx}>
        <LinkForm scrollable collapsible />
      </LinkFormContext.Provider>
    </div>
  )
}

function stubPointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: coarse }) as unknown as typeof window.matchMedia
}

describe('LinkForm focus on open', () => {
  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia
  })

  it('marks Tags (not Title) to be focused in edit mode', () => {
    renderForm()
    expect(screen.getByLabelText('Tags').getAttribute('data-autofocus')).toBe('always')
    expect(screen.getByLabelText('Title').hasAttribute('data-autofocus')).toBe(false)
  })

  it('keeps URL as the autofocus field in add mode, with none on Tags', () => {
    renderForm({ mode: 'add', url: '' }, true)
    expect(screen.getByLabelText('URL').hasAttribute('data-autofocus')).toBe(true)
    expect(screen.getByLabelText('Tags').hasAttribute('data-autofocus')).toBe(false)
  })

  it.each([
    ['a fine pointer', false],
    ['a touch screen', true],
  ])('focuses Tags when the edit dialog opens with %s', (_, coarse) => {
    stubPointer(coarse)
    render(<DialogForm ctx={makeContext()} />)
    expect(document.activeElement).toBe(screen.getByLabelText('Tags'))
  })

  it('focuses the panel, not a field, when the add dialog opens on a touch screen', () => {
    stubPointer(true)
    render(<DialogForm ctx={makeContext({ mode: 'add', url: '' })} />)
    expect(document.activeElement).toBe(screen.getByTestId('panel'))
  })
})
