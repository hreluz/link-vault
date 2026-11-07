import { Icon, type IconProps } from './Icon'

/** Loading spinner. Spin it with `animate-spin` in className. */
export function SpinnerIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 24 24" stroke="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </Icon>
  )
}
