// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
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
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, moved_to_end_at: null,
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
    expect(screen.getByTestId('last-opened-pulse')).toBeTruthy()
    // Fading the card itself would reveal the swipe-delete backdrop beneath it.
    expect(container.querySelector('article')?.className).not.toContain('animate-pulse')

    rerender(<LinkCard link={LINK} onMenuOpen={vi.fn()} onFavoriteToggle={vi.fn()} isLastOpened />)
    expect(screen.queryByTestId('last-opened-pulse')).toBeNull()
  })

  it('pulses on pulse alone, without being the last-opened link (restored after undo)', () => {
    renderCard({ pulse: true })
    expect(screen.getByTestId('last-opened-pulse')).toBeTruthy()
    expect(screen.queryByText('Last opened')).toBeNull()
  })

  it('marks the card with data-link-id and scroll-mt-20, and the title link with data-card-title', () => {
    const { container } = renderCard()
    const card = container.querySelector('article[data-link-id="1"]')
    expect(card?.className).toContain('scroll-mt-20')
    expect(card?.querySelector('a[data-card-title]')?.textContent).toBe('Alpha Article')
  })

})

describe('LinkCard edit shortcut', () => {
  it('calls onEdit from the card without opening the menu', () => {
    const onEdit = vi.fn()
    const onMenuOpen = vi.fn()
    renderCard({ onEdit, onMenuOpen })

    fireEvent.click(screen.getByRole('button', { name: 'Edit link' }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onMenuOpen).not.toHaveBeenCalled()
  })

  it('hides the edit button when no handler is given', () => {
    renderCard()
    expect(screen.queryByRole('button', { name: 'Edit link' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit link' })).toBeNull()
  })
})

describe('LinkCard delete button', () => {
  it('is the first button in the row, before the favorite star', () => {
    renderCard({ onDelete: vi.fn(), onEdit: vi.fn() })

    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'))
    expect(names).toEqual(['Delete link', 'Add to favorites', 'Edit link', 'Link options'])
  })

  it('calls onDelete once on a non-favorite link', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })

    const button = screen.getByRole('button', { name: 'Delete link' })
    expect(button).toHaveProperty('disabled', false)
    expect(button.getAttribute('title')).toBe('Delete')
    fireEvent.click(button)

    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('is aria-disabled, not disabled, on a favorite link so the tap still reaches onDelete', () => {
    // onDelete is handleDelete, which shows "Unfavorite to delete" for a favorite
    // and deletes nothing (covered in the useLinkMutations tests).
    const onDelete = vi.fn()
    renderCard({ link: { ...LINK, is_favorite: true }, onDelete })

    const button = screen.getByRole('button', { name: 'Delete link' })
    expect(button).toHaveProperty('disabled', false)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.getAttribute('title')).toBe('Unfavorite to delete')
    fireEvent.click(button)

    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('has no aria-disabled on a non-favorite link', () => {
    renderCard({ onDelete: vi.fn() })
    expect(screen.getByRole('button', { name: 'Delete link' }).hasAttribute('aria-disabled')).toBe(false)
  })

  it('is not rendered without onDelete', () => {
    renderCard()
    expect(screen.queryByRole('button', { name: 'Delete link' })).toBeNull()
  })
})

describe('LinkCard image states', () => {
  const WITH_IMAGE: LinkWithTags = { ...LINK, image_url: 'https://cdn.example.com/a.jpg', duration: '4:33' }

  it('shows the image with the duration badge over it when there is no state', () => {
    const { container } = renderCard({ link: WITH_IMAGE })

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example.com/a.jpg')
    expect(screen.queryByTestId('card-image-refreshing')).toBeNull()
    expect(screen.getAllByText('4:33')).toHaveLength(1)
  })

  it('calls onImageError when the image fails to load', () => {
    const onImageError = vi.fn()
    const { container } = renderCard({ link: WITH_IMAGE, onImageError })

    fireEvent.error(container.querySelector('img')!)

    expect(onImageError).toHaveBeenCalledTimes(1)
  })

  it('shows a pulsing placeholder instead of the image while refreshing, keeping the duration badge', () => {
    const { container } = renderCard({ link: WITH_IMAGE, imageState: 'refreshing' })

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByTestId('card-image-refreshing').className).toContain('animate-pulse')
    expect(screen.getAllByText('4:33')).toHaveLength(1)
  })

  it('shows the no-image layout with the duration inline when the refresh failed', () => {
    const { container } = renderCard({ link: WITH_IMAGE, imageState: 'failed' })

    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByTestId('card-image-refreshing')).toBeNull()
    expect(screen.getByText('4:33').closest('p')?.textContent).toContain('alpha.com')
  })
})

describe('LinkCard send to end', () => {
  it('calls onSendToEnd and not onOpen when clicked', () => {
    const onSendToEnd = vi.fn()
    const onOpen = vi.fn()
    renderCard({ onSendToEnd, onOpen })

    const button = screen.getByRole('button', { name: 'Send to end' })
    expect(button.getAttribute('title')).toBe('Send to end')
    fireEvent.click(button)

    expect(onSendToEnd).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('sits between Edit and the options menu', () => {
    renderCard({ onSendToEnd: vi.fn(), onEdit: vi.fn() })

    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'))
    expect(names.indexOf('Send to end')).toBe(names.indexOf('Edit link') + 1)
    expect(names.indexOf('Link options')).toBe(names.indexOf('Send to end') + 1)
  })

  it('is not rendered without onSendToEnd', () => {
    renderCard()
    expect(screen.queryByRole('button', { name: 'Send to end' })).toBeNull()
  })
})

describe('LinkCard long press', () => {
  afterEach(() => vi.useRealTimers())

  it('a 600 ms pointer hold does not change the card, and its title link stays rendered', () => {
    vi.useFakeTimers()
    renderCard()
    const article = screen.getByRole('article')
    const before = article.innerHTML

    fireEvent.pointerDown(article)
    act(() => { vi.advanceTimersByTime(600) })
    fireEvent.pointerUp(article)

    expect(article.innerHTML).toBe(before)
    expect(screen.getByRole('link', { name: LINK.title! })).toBeTruthy()
  })
})

describe('LinkCard action row (SPEC 34)', () => {
  const ALL = { onDelete: vi.fn(), onEdit: vi.fn(), onSendToEnd: vi.fn() }

  it('holds all five actions in a bottom row, after the title and tags', () => {
    renderCard(ALL)

    const row = screen.getByTestId('card-actions')
    const names = Array.from(row.querySelectorAll('button')).map(b => b.getAttribute('aria-label'))
    expect(names).toEqual(['Delete link', 'Add to favorites', 'Edit link', 'Send to end', 'Link options'])
    // The row comes after the title in document order.
    const title = screen.getByRole('link', { name: 'Alpha Article' })
    expect(title.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sizes every action 44px below lg and 40px at lg, with a focus ring', () => {
    renderCard(ALL)

    for (const button of screen.getByTestId('card-actions').querySelectorAll('button')) {
      expect(button.className).toContain('h-11')
      expect(button.className).toContain('w-11')
      expect(button.className).toContain('lg:h-10')
      expect(button.className).toContain('focus-ring')
      // Each button sits above the stretched title link on its own.
      expect(button.className).toContain('z-10')
    }
    expect(screen.getByTestId('card-actions').className).toContain('gap-2')
  })

  it('does not put the row itself above the stretched link, so gaps still open the link', () => {
    renderCard(ALL)
    expect(screen.getByTestId('card-actions').className).not.toContain('z-10')
  })

  it('reports the options menu state with aria-haspopup and aria-expanded', () => {
    const { rerender } = renderCard()
    const options = screen.getByRole('button', { name: 'Link options' })
    expect(options.getAttribute('aria-haspopup')).toBe('dialog')
    expect(options.getAttribute('aria-expanded')).toBe('false')

    rerender(<LinkCard link={LINK} onMenuOpen={vi.fn()} onFavoriteToggle={vi.fn()} isMenuOpen />)
    expect(screen.getByRole('button', { name: 'Link options' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('leaves the category alone in the top row', () => {
    renderCard({ ...ALL, category: { id: 'c', user_id: 'u', name: 'YouTube', description: null, color: null, emoticon: '📺', created_at: '', updated_at: '' } })

    const pill = screen.getByText('YouTube')
    expect(screen.getByTestId('card-actions').contains(pill)).toBe(false)
  })
})

describe('LinkCard fallback title', () => {
  it('shows the URL path as a clickable title when the title is null', () => {
    const onOpen = vi.fn()
    renderCard({ link: { ...LINK, title: null, url: 'https://www.instagram.com/reel/abc/' }, onOpen })

    const link = screen.getByRole('link', { name: 'reel/abc' })
    expect(link.getAttribute('href')).toBe('https://www.instagram.com/reel/abc/')
    fireEvent.click(link)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('shows the hostname when the title is null and the URL has no path', () => {
    renderCard({ link: { ...LINK, title: null, url: 'https://example.com/' } })

    expect(screen.getByRole('link', { name: 'example.com' })).toBeTruthy()
  })

  it('shows a real title unchanged', () => {
    renderCard()

    expect(screen.getByRole('link', { name: 'Alpha Article' })).toBeTruthy()
  })
})

describe('LinkCard favorite star', () => {
  it('renders an outline StarIcon, not an emoji, on a non-favorite', () => {
    renderCard()
    const button = screen.getByRole('button', { name: 'Add to favorites' })
    expect(button.textContent).toBe('')
    expect(button.querySelector('svg')?.getAttribute('fill')).toBe('none')
    expect(button.className).toContain('text-surface-500')
  })

  it('renders a filled amber StarIcon on a favorite', () => {
    renderCard({ link: { ...LINK, is_favorite: true } })
    const button = screen.getByRole('button', { name: 'Remove from favorites' })
    expect(button.textContent).toBe('')
    expect(button.querySelector('svg')?.getAttribute('fill')).toBe('currentColor')
    expect(button.className).toContain('text-amber-400')
  })
})
