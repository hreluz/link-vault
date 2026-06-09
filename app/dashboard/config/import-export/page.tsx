import type { Metadata } from 'next'
import ImportExportClient from './ImportExportClient'

export const metadata: Metadata = { title: 'Import & Export — Link Vault' }

export default function ImportExportPage() {
  return <ImportExportClient />
}
