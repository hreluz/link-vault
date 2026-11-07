import type { ReactNode } from 'react'

/** Props every icon accepts. Size and colour come from className (e.g. `h-5 w-5`, text colour via currentColor). */
export type IconProps = {
  className?: string
}

type BaseProps = IconProps & {
  /** Default '0 0 20 20'. Existing 16- and 24-unit icons pass their own so their geometry is unchanged. */
  viewBox?: string
  /** Default 1.6, matching the LinkCard action icons. */
  strokeWidth?: number
  /** Default 'none' (outline icons). Solid icons pass 'currentColor'. */
  fill?: string
  /** Default 'currentColor'. Solid icons pass 'none' so they aren't outlined. */
  stroke?: string
  children: ReactNode
}

/**
 * The only place in the app that writes an <svg> element (SPEC 38). Every icon
 * in components/icons/ renders this with its own paths; callers import the
 * named icon from '@/components/icons' and never write SVG markup themselves.
 */
export function Icon({
  className, viewBox = '0 0 20 20', strokeWidth = 1.6, fill = 'none', stroke = 'currentColor', children,
}: BaseProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}
