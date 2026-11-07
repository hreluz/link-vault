import { Icon, type IconProps } from './Icon'

export function FolderIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M2.5 6A1.5 1.5 0 014 4.5h3.2l1.8 2h7A1.5 1.5 0 0117.5 8v6.5A1.5 1.5 0 0116 16H4a1.5 1.5 0 01-1.5-1.5V6z" />
    </Icon>
  )
}
