import { Icon, type IconProps } from './Icon'

/** Eye: the Watching status. */
export function EyeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.5" />
    </Icon>
  )
}
