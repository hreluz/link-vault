import { Icon, type IconProps } from './Icon'

/** Arrow down onto a line: the LinkCard "Send to end" action. */
export function SendToEndIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10 3.5v9M6 8.5l4 4 4-4M4 16.5h12" />
    </Icon>
  )
}
