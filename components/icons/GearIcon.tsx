import { Icon, type IconProps } from './Icon'

export function GearIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M17.5 8.75L17.5 11.25L15.65 11.71L15.2 12.78L16.18 14.42L14.42 16.18L12.79 15.2L11.71 15.65L11.25 17.5L8.75 17.5L8.29 15.65L7.22 15.2L5.58 16.18L3.82 14.42L4.8 12.79L4.35 11.71L2.5 11.25L2.5 8.75L4.35 8.29L4.8 7.22L3.82 5.58L5.58 3.82L7.21 4.8L8.29 4.35L8.75 2.5L11.25 2.5L11.71 4.35L12.78 4.8L14.42 3.82L16.18 5.58L15.2 7.21L15.65 8.29Z" />
      <circle cx="10" cy="10" r="2.4" />
    </Icon>
  )
}
