// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import * as icons from '@/components/icons'
import { Icon, StarIcon, TrashSolidIcon, ChevronDownIcon, RefreshIcon } from '@/components/icons'

afterEach(cleanup)

function svgOf(ui: React.ReactElement) {
  return render(ui).container.querySelector('svg')!
}

describe('Icon base', () => {
  it('renders a decorative, currentColor outline svg with the 20-unit defaults', () => {
    const svg = svgOf(<Icon className="h-5 w-5"><path d="M0 0" /></Icon>)
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')
    expect(svg.getAttribute('viewBox')).toBe('0 0 20 20')
    expect(svg.getAttribute('fill')).toBe('none')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('stroke-width')).toBe('1.6')
    expect(svg.getAttribute('class')).toBe('h-5 w-5')
  })

  it('takes viewBox, strokeWidth, fill and stroke overrides', () => {
    const svg = svgOf(
      <Icon viewBox="0 0 16 16" strokeWidth={2} fill="currentColor" stroke="none"><path d="M0 0" /></Icon>,
    )
    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(svg.getAttribute('fill')).toBe('currentColor')
    expect(svg.getAttribute('stroke')).toBe('none')
  })
})

describe('icon components', () => {
  const named = Object.entries(icons).filter(([name]) => name !== 'Icon') as [string, (p: icons.IconProps) => React.ReactElement][]

  it.each(named)('%s renders one aria-hidden svg and passes className through', (_name, Component) => {
    const { container } = render(<Component className="test-size" />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0].getAttribute('aria-hidden')).toBe('true')
    expect(svgs[0].getAttribute('class')).toBe('test-size')
  })

  it('keeps the moved icons on their original geometry', () => {
    expect(svgOf(<TrashSolidIcon />).getAttribute('viewBox')).toBe('0 0 16 16')
    expect(svgOf(<TrashSolidIcon />).getAttribute('fill')).toBe('currentColor')
    expect(svgOf(<TrashSolidIcon />).getAttribute('stroke')).toBe('none')
    expect(svgOf(<ChevronDownIcon />).getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svgOf(<ChevronDownIcon />).getAttribute('stroke-width')).toBe('2')
    expect(svgOf(<RefreshIcon />).getAttribute('stroke-width')).toBe('1.5')
  })
})

describe('StarIcon', () => {
  it('fills only when filled, with the same path and box either way', () => {
    const outline = svgOf(<StarIcon />)
    const outlinePath = outline.querySelector('path')!.getAttribute('d')
    const outlineBox = outline.getAttribute('viewBox')
    cleanup()
    const filled = svgOf(<StarIcon filled />)

    expect(outline.getAttribute('fill')).toBe('none')
    expect(filled.getAttribute('fill')).toBe('currentColor')
    expect(filled.querySelector('path')!.getAttribute('d')).toBe(outlinePath)
    expect(filled.getAttribute('viewBox')).toBe(outlineBox)
  })
})
