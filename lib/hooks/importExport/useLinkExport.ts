'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { buildVaultExport } from '@/lib/services/importExport/exportVault'
import { getPrivateTagIds } from '@/lib/services/tags/tags'
import { useVault } from '@/lib/context/VaultContext'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { triggerDownload } from '@/lib/utils/downloadFile'
import { linksToCSV } from '@/lib/utils/linksCsv'
import type { ExportMode } from '@/lib/types/importExport'

type ExportFormat = 'json' | 'csv'
type Exporting = { mode: ExportMode; format: ExportFormat } | null

export function useLinkExport() {
  const { dek } = useVault()
  const { unlockedTagIds } = useUnlockedTags()
  const [privateTagIds, setPrivateTagIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState<Exporting>(null)

  useEffect(() => {
    getPrivateTagIds().then(ids => setPrivateTagIds(new Set(ids)))
  }, [])

  // All private tags unlock together (single global password), so this is really a binary
  // check -- but written this way it stays correct if that ever stops being all-or-nothing.
  const hasLockedPrivateTags = [...privateTagIds].some(id => !unlockedTagIds.has(id))

  async function handleExport(mode: ExportMode, format: ExportFormat) {
    if (!dek) return
    setExporting({ mode, format })
    try {
      const { data, hiddenPrivateLinksCount } = await buildVaultExport(mode, dek, unlockedTagIds, privateTagIds)
      const now = new Date().toISOString().slice(0, 10)
      const suffix = mode === 'everything' ? '-everything' : ''

      if (format === 'json') {
        triggerDownload(JSON.stringify(data, null, 2), `link-vault${suffix}-${now}.json`, 'application/json')
      } else {
        triggerDownload(linksToCSV(data.links), `link-vault${suffix}-${now}.csv`, 'text/csv')
      }

      toast.success(`Exported ${data.links.length} links as ${format.toUpperCase()}`)
      if (hiddenPrivateLinksCount > 0) {
        toast.warning(
          `${hiddenPrivateLinksCount} link${hiddenPrivateLinksCount !== 1 ? 's' : ''} behind locked private tags ` +
          `${hiddenPrivateLinksCount !== 1 ? 'were' : 'was'} not included — unlock them first to include.`,
        )
      }
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  return { exporting, hasLockedPrivateTags, handleExport }
}
