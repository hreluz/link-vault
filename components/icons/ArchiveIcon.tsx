import { Icon, type IconProps } from './Icon'

/** Archive box: the Archived status. */
export function ArchiveIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 4.5h14v3H3z" />
      <path d="M4.5 7.5v8a1 1 0 001 1h9a1 1 0 001-1v-8M8 10.5h4" />
    </Icon>
  )
}
