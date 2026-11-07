import { Icon, type IconProps } from './Icon'

export function PencilIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" />
    </Icon>
  )
}
