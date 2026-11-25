import { Icon, type IconProps } from './Icon'

export function ChevronUpIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M5 15l7-7 7 7" />
    </Icon>
  )
}
