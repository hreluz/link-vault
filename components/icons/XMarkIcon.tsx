import { Icon, type IconProps } from './Icon'

export function XMarkIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}
