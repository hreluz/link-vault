import { Icon, type IconProps } from './Icon'

/** Solid 16-unit open padlock (private tags unlocked / private tag marker). */
export function LockOpenIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 16 16" fill="currentColor" stroke="none">
      <path d="M11 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H9V4.5a2 2 0 1 1 4 0 .75.75 0 0 0 1.5 0A3.5 3.5 0 0 0 11 1Z" />
    </Icon>
  )
}
