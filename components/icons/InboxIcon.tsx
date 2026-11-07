import { Icon, type IconProps } from './Icon'

/** Tray: the Unread status. */
export function InboxIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 11h4l1 2h4l1-2h4" />
      <path d="M3 11l2-6.5h10l2 6.5v4.5a1 1 0 01-1 1H4a1 1 0 01-1-1V11z" />
    </Icon>
  )
}
