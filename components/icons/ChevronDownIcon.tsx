import { Icon, type IconProps } from './Icon'

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M19 9l-7 7-7-7" />
    </Icon>
  )
}
