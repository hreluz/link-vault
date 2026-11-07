import { Icon, type IconProps } from './Icon'

/** Solid 16-unit closed padlock (private tags locked). */
export function LockClosedIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 16 16" fill="currentColor" stroke="none">
      <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" clipRule="evenodd" />
    </Icon>
  )
}
