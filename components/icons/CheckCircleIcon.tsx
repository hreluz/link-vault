import { Icon, type IconProps } from './Icon'

/** Circled check: the Read status. */
export function CheckCircleIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10.2l2 2 4-4.4" />
    </Icon>
  )
}
