import { Icon, type IconProps } from './Icon'

export function EllipsisHorizontalIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </Icon>
  )
}
