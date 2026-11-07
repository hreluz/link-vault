import { Icon, type IconProps } from './Icon'

export function UndoIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.5}>
      <path d="M7.5 5 4 8.5 7.5 12" />
      <path d="M4 8.5h7.5a4.5 4.5 0 0 1 0 9H9" />
    </Icon>
  )
}
