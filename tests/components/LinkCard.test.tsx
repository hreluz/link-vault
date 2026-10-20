// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import LinkCard from '@/app/dashboard/link/LinkCard'
import type { LinkWithTags } from '@/lib/services/links'

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }),
}))

afterEach(cleanup)

const LINK: LinkWithTags = {
  id: '1', user_id: 'user-1', url: 'https://alpha.com', title: 'Alpha Article',
  description: null, site_name: 'alpha.com', image_url: null, duration: null, notes: null,
  category_id: null, status: 'read', is_favorite: false, tags: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
}

function renderCard(props: Partial<React.ComponentProps<typeof LinkCard>> = {}) {
  return render(
    <LinkCard link={LINK} onMenuOpen={vi.fn()} onFavoriteToggle={vi.fn()} {...props} />
  )
}

describe('LinkCard last-opened marker', () => {
  it('shows no marker by default', () => {
    renderCard()

    expect(screen.queryByText('Last opened')).toBeNull()
    expect(screen.getByRole('link', { name: 'Alpha Article' }).getAttribute('aria-current')).toBeNull()
  })

  it('shows the pill and aria-current when it is the last-opened link', () => {
    renderCard({ isLastOpened: true })

    expect(screen.getByText('Last opened')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Alpha Article' }).getAttribute('aria-current')).toBe('true')
  })

  it('pulses only while pulse is set', () => {
    const { container, rerender } = renderCard({ isLastOpened: true, pulse: true })
    expect(container.querySelector('article')?.className).toContain('motion-safe:animate-pulse')

    rerender(<LinkCard link={LINK} onMenuOpen={vi.fn()} onFavoriteToggle={vi.fn()} isLastOpened />)
    expect(container.querySelector('article')?.className).not.toContain('motion-safe:animate-pulse')
  })

  it('hides the marker in selection mode', () => {
    renderCard({ isLastOpened: true, pulse: true, isSelectionMode: true })

    expect(screen.queryByText('Last opened')).toBeNull()
  })
})
