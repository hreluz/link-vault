import { Icon, type IconProps } from './Icon'

/** Solid play triangle: the collection page's Play next button. */
export function PlayIcon({ className }: IconProps) {
  return (
    <Icon className={className} fill="currentColor" stroke="none">
      <path d="M6.3 3.9A1 1 0 0 0 4.8 4.8v10.4a1 1 0 0 0 1.5.9l8.6-5.2a1 1 0 0 0 0-1.8L6.3 3.9Z" />
    </Icon>
  )
}
