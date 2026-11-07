import { Icon, type IconProps } from './Icon'

/** Chain link: the Links nav item. */
export function LinkIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M8.5 11.5a3 3 0 004.24 0l2.62-2.62a3 3 0 00-4.24-4.24l-.87.87" />
      <path d="M11.5 8.5a3 3 0 00-4.24 0l-2.62 2.62a3 3 0 004.24 4.24l.87-.87" />
    </Icon>
  )
}
