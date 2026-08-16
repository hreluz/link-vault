'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { getLinks } from '@/lib/services/links'
import { getCategories } from '@/lib/services/categories'
import { useVault } from '@/lib/context/VaultContext'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { triggerDownload } from '@/lib/utils/downloadFile'
import { linksToCSV } from '@/lib/utils/linksCsv'

export function useLinkExport() {
  const { dek } = useVault()
  const tagNameById = useTagNameLookup()
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null)

  async function handleExport(format: 'json' | 'csv') {
    if (!dek) return
    setExporting(format)
    try {
      const links = await getLinks(dek)
      const now = new Date().toISOString().slice(0, 10)
      if (format === 'json') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them from the export
        const data = links.map(({ user_id, deleted_at, tags, ...rest }) => ({
          ...rest,
          tags: tags.map(id => tagNameById.get(id) ?? id),
        }))
        triggerDownload(JSON.stringify(data, null, 2), `link-vault-${now}.json`, 'application/json')
      } else {
        const categories = await getCategories(dek)
        const categoryMap = new Map(categories.map(c => [c.id, c.name]))
        triggerDownload(linksToCSV(links, categoryMap, tagNameById), `link-vault-${now}.csv`, 'text/csv')
      }
      toast.success(`Exported ${links.length} links as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  return { exporting, handleExport }
}
