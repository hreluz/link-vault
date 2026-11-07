import { Icon, type IconProps } from './Icon'

/**
 * Favorite star. Filled and outline share one path, so both states are the
 * same size and shape; only the fill changes.
 */
export function StarIcon({ filled = false, className }: IconProps & { filled?: boolean }) {
  return (
    <Icon className={className} fill={filled ? 'currentColor' : 'none'}>
      <path d="M10 2.8l2.23 4.52 4.99.73-3.61 3.52.85 4.97L10 14.2l-4.46 2.34.85-4.97L2.78 8.05l4.99-.73L10 2.8z" />
    </Icon>
  )
}
