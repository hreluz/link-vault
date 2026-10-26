// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import BottomSheet from '@/app/dashboard/link/BottomSheet'
import type { LinkWithTags } from '@/lib/services/links'

afterEach(cleanup)

const LINK: LinkWithTags = {
  id: '1', user_id: 'user-1', url: 'https://alpha.com', title: 'Alpha Article',
  description: null, site_name: 'alpha.com', image_url: null, duration: null, notes: null,
  category_id: null, status: 'read', is_favorite: false, tags: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, moved_to_end_at: null,
}

function renderSheet(link: LinkWithTags = LINK) {
  return render(<BottomSheet link={link} onStatusChange={vi.fn()} onClose={vi.fn()} />)
}

describe('BottomSheet', () => {
  it('renders the four status options', () => {
    renderSheet()

    expect(screen.getAllByRole('radio').map(r => r.textContent)).toEqual([
      expect.stringContaining('Unread'),
      expect.stringContaining('Watching'),
      expect.stringContaining('Read'),
      expect.stringContaining('Archived'),
    ])
  })

  it.each([
    ['a non-favorite', false],
    ['a favorite', true],
  ])('has no delete action for %s link', (_, isFavorite) => {
    renderSheet({ ...LINK, is_favorite: isFavorite })

    expect(screen.queryByRole('button', { name: /delete link/i })).toBeNull()
    expect(screen.queryByText(/unfavorite to delete/i)).toBeNull()
  })
})
