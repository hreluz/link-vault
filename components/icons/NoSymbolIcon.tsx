import { Icon, type IconProps } from './Icon'

/** Solid 16-unit circle with a slash, used on the Trash card Restore button. */
export function NoSymbolIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 16 16" fill="currentColor" stroke="none">
      <path fillRule="evenodd" d="M14 8a6 6 0 0 1-9.84 4.605L12 4.697A5.979 5.979 0 0 1 14 8Zm-2.16-5.395L4 10.303A6 6 0 0 1 12 2.605ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Z" clipRule="evenodd" />
    </Icon>
  )
}
