// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import CollectionForm, { DESCRIPTION_COUNTER_FROM } from '@/app/dashboard/organize/collections/CollectionForm'
import CollectionRow from '@/app/dashboard/organize/collections/CollectionRow'
import { COLLECTION } from '../hooks/collections/fixtures'

const { theme } = vi.hoisted(() => ({ theme: { current: 'light' as 'light' | 'dark' } }))
vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: theme.current }) }))
// The picker itself is a third-party web component; this stand-in exposes the theme it gets.
vi.mock('@emoji-mart/react', () => ({
  default: ({ theme }: { theme: string }) => <div data-testid="emoji-picker" data-theme={theme} />,
}))

function setPointer(fine: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: fine)' ? fine : !fine,
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function Harness({ initialDescription = '' }: { initialDescription?: string }) {
  const [description, setDescription] = React.useState(initialDescription)
  return (
    <CollectionForm
      name="" onNameChange={() => {}}
      emoji="" onEmojiChange={() => {}}
      description={description} onDescriptionChange={setDescription}
      error={null} saving={false} submitLabel="Save"
      onSubmit={() => {}} onCancel={() => {}}
    />
  )
}

beforeEach(() => {
  theme.current = 'light'
  setPointer(true)
})
afterEach(cleanup)

describe('CollectionForm', () => {
  it('has visible Name and Description labels', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Name')).toBeTruthy()
    expect(screen.getByLabelText(/Description/)).toBeTruthy()
  })

  it('focuses the name with a fine pointer, but not on touch screens', () => {
    render(<Harness />)
    expect(document.activeElement).toBe(screen.getByLabelText('Name'))
    cleanup()
    setPointer(false)
    render(<Harness />)
    expect(document.activeElement).not.toBe(screen.getByLabelText('Name'))
  })

  it('shows the description counter from the threshold, amber near the limit', () => {
    render(<Harness />)
    const input = screen.getByLabelText(/Description/)
    fireEvent.change(input, { target: { value: 'x'.repeat(DESCRIPTION_COUNTER_FROM - 1) } })
    expect(screen.queryByText(/\/200$/)).toBeNull()
    fireEvent.change(input, { target: { value: 'x'.repeat(DESCRIPTION_COUNTER_FROM) } })
    const counter = screen.getByText(`${DESCRIPTION_COUNTER_FROM}/200`)
    expect(counter.className).not.toMatch(/amber/)
    expect(input.getAttribute('aria-describedby')).toBe(counter.id)
    fireEvent.change(input, { target: { value: 'x'.repeat(195) } })
    expect(screen.getByText('195/200').className).toMatch(/amber/)
  })

  it('opens the emoji picker in the current theme', () => {
    theme.current = 'dark'
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose an emoji' }))
    expect(screen.getByTestId('emoji-picker').getAttribute('data-theme')).toBe('dark')
  })
})

describe('CollectionRow', () => {
  const withCounts = { ...COLLECTION, link_count: 2, done_count: 1 }

  it('shows the emoji when set', () => {
    render(<CollectionRow collection={withCounts} />)
    expect(screen.getByText('🎓')).toBeTruthy()
    expect(screen.queryByTestId('collection-folder-tile')).toBeNull()
  })

  it('shows a folder tile when there is no emoji', () => {
    render(<CollectionRow collection={{ ...withCounts, emoji: null }} />)
    expect(screen.getByTestId('collection-folder-tile').querySelector('svg')).toBeTruthy()
  })
})
