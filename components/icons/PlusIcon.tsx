import { Icon, type IconProps } from './Icon'

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}
