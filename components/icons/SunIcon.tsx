import { Icon, type IconProps } from './Icon'

export function SunIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M15.8 10H17.6M14.1 14.1L15.37 15.37M10 15.8V17.6M5.9 14.1L4.63 15.37M4.2 10H2.4M5.9 5.9L4.63 4.63M10 4.2V2.4M14.1 5.9L15.37 4.63" />
    </Icon>
  )
}
