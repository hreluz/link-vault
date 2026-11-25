import { Icon, type IconProps } from './Icon'

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M9 5l7 7-7 7" />
    </Icon>
  )
}
