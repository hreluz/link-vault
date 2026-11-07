import { Icon, type IconProps } from './Icon'

/** Funnel: the Filters button. */
export function FilterIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 4.5h14l-5.5 6.5v4.5l-3 1.5v-6L3 4.5z" />
    </Icon>
  )
}
