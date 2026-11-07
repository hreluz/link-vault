import { Icon, type IconProps } from './Icon'

/**
 * Solid 16-unit open padlock with the shackle set half a unit further right
 * than LockOpenIcon. The private-tag marker in Organize → Tags (TagRow) has
 * always used this variant, so it keeps its exact look (SPEC 38).
 */
export function LockOpenAltIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 16 16" fill="currentColor" stroke="none">
      <path d="M11.5 1A3.5 3.5 0 0 0 8 4.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H9.5V4.5a2 2 0 1 1 4 0v1a.75.75 0 0 0 1.5 0v-1A3.5 3.5 0 0 0 11.5 1Z" />
    </Icon>
  )
}
