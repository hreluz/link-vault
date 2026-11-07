import { Icon, type IconProps } from './Icon'

export function SearchIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l4 4" />
    </Icon>
  )
}
