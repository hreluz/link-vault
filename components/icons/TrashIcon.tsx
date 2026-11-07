import { Icon, type IconProps } from './Icon'

export function TrashIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5 5.5l.8 10.6a1 1 0 001 .9h6.4a1 1 0 001-.9L15 5.5M8.5 9v5M11.5 9v5" />
    </Icon>
  )
}
