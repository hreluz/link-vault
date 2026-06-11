import type { Metadata } from 'next'
import TrashList from './TrashList'

export const metadata: Metadata = { title: 'Trash — Link Vault' }

export default function TrashPage() {
  return <TrashList />
}
