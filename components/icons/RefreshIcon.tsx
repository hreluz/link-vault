import { Icon, type IconProps } from './Icon'

export function RefreshIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.5}>
      <path d="M16 10a6 6 0 1 1-1.76-4.24" />
      <path d="M16 3.5v3h-3" />
    </Icon>
  )
}
