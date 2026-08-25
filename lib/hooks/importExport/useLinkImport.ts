'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { importLinks, type ImportLinkInput } from '@/lib/services/links'
import { getOrCreateCategoryByName } from '@/lib/services/categories'
import { importVaultExport, type VaultImportResult, type VaultImportProgress } from '@/lib/services/importExport/importVault'
import { isVaultExportV2, getVaultExportValidationError, type VaultExportV2 } from '@/lib/types/importExport'
import { useVault } from '@/lib/context/VaultContext'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { parseCSV } from '@/lib/utils/linksCsv'

export type ImportTab = 'urls' | 'json' | 'file'

type LastResult = { imported: number; skipped: number; duplicates: number } & Partial<
  Pick<VaultImportResult, 'categoriesCreated' | 'domainsCreated' | 'tagsCreated'>
>

async function readFileText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

type VaultExportDetection = { data: VaultExportV2 | null; error: string | null }

/** Sniffs whether the given JSON text is a full v2 vault export, for a live "everything" file.
 *  A v2-shaped-but-invalid file comes back as `{ data: null, error: <reason> }`, distinct from
 *  `{ data: null, error: null }` for text that isn't meant to be a v2 export at all (legacy/plain). */
function tryDetectVaultExport(text: string): VaultExportDetection {
  try {
    const parsed = JSON.parse(text)
    if (!isVaultExportV2(parsed)) return { data: null, error: null }
    const error = getVaultExportValidationError(parsed)
    return error ? { data: null, error } : { data: parsed, error: null }
  } catch {
    return { data: null, error: null }
  }
}

export function useLinkImport() {
  const { dek } = useVault()
  const { refetchTags } = useTagsContext()
  const { categories } = useCategoryList()
  const [importTab, setImportTab] = useState<ImportTab>('urls')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [urlsText, setUrlsText] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('')
  const defaultCategorySet = useRef(false)
  const [importing, setImporting] = useState(false)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)
  const [detectedVaultExport, setDetectedVaultExport] = useState<VaultExportV2 | null>(null)
  const [vaultExportError, setVaultExportError] = useState<string | null>(null)
  const [applyPreferences, setApplyPreferences] = useState(true)
  const [progress, setProgress] = useState<VaultImportProgress | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (categories.length > 0 && !defaultCategorySet.current) {
      const notDefined = categories.find(c => c.name === 'Not defined')
      setDefaultCategoryId((notDefined ?? categories[0]).id)
      defaultCategorySet.current = true
    }
  }, [categories])

  // Live-detect a full-vault (v2) export so the UI can offer the "apply appearance" choice
  // before the user commits to importing -- covers both the JSON textarea and a .json upload.
  useEffect(() => {
    let cancelled = false

    function apply(detection: VaultExportDetection) {
      if (cancelled) return
      setDetectedVaultExport(detection.data)
      setVaultExportError(detection.error)
    }

    async function detect() {
      if (importTab === 'json') {
        apply(tryDetectVaultExport(jsonText))
        return
      }
      if (importTab === 'file' && selectedFile && selectedFile.name.endsWith('.json')) {
        const text = await readFileText(selectedFile)
        apply(tryDetectVaultExport(text))
        return
      }
      apply({ data: null, error: null })
    }

    detect()
    return () => { cancelled = true }
  }, [importTab, jsonText, selectedFile])

  function switchTab(tab: ImportTab) {
    setImportTab(tab)
    setLastResult(null)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragLeave() { setIsDragging(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  const hasImportContent =
    importTab === 'urls' ? urlsText.trim().length > 0
    : importTab === 'json' ? jsonText.trim().length > 0
    : !!selectedFile

  function successToast(result: LastResult) {
    const dupSuffix = result.duplicates > 0 ? ` (${result.duplicates} already existed)` : ''
    const extras: string[] = []
    if (result.categoriesCreated) extras.push(`${result.categoriesCreated} categories`)
    if (result.tagsCreated) extras.push(`${result.tagsCreated} tags`)
    if (result.domainsCreated) extras.push(`${result.domainsCreated} domain rules`)
    const extrasSuffix = extras.length > 0 ? `, plus ${extras.join(', ')}` : ''
    toast.success(`Imported ${result.imported} link${result.imported !== 1 ? 's' : ''}${dupSuffix}${extrasSuffix}`)
  }

  async function handleImport() {
    if (!dek) return
    if (vaultExportError) { toast.error(vaultExportError); return }
    setImporting(true)
    setLastResult(null)
    setProgress(null)
    const catId = defaultCategoryId || null

    try {
      // ── full-vault (v2) export detected on the json/file tab ──────────
      if (detectedVaultExport) {
        const result = await importVaultExport(
          detectedVaultExport,
          { defaultCategoryId: catId, applyPreferences, onProgress: setProgress },
          dek,
        )
        setLastResult(result)
        if (result.imported > 0) {
          setJsonText('')
          setSelectedFile(null)
          refetchTags()
          successToast(result)
        } else {
          const parts: string[] = []
          if (result.duplicates > 0) parts.push(`${result.duplicates} already existed`)
          if (result.skipped > 0) parts.push(`${result.skipped} invalid`)
          toast.warning(`No links imported${parts.length > 0 ? ` — ${parts.join(', ')}` : ''}`)
        }
        return
      }

      let inputs: ImportLinkInput[] = []

      if (importTab === 'urls') {
        inputs = urlsText
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map(url => ({ url, tags: [] }))
      } else if (importTab === 'json') {
        let parsed: unknown
        try { parsed = JSON.parse(jsonText) } catch { toast.error('Invalid JSON'); return }
        if (!Array.isArray(parsed)) { toast.error('JSON must be an array'); return }
        inputs = (parsed as ImportLinkInput[]).filter(item => typeof item?.url === 'string')
      } else if (importTab === 'file' && selectedFile) {
        const text = await readFileText(selectedFile)
        if (selectedFile.name.endsWith('.csv')) {
          const parsed = parseCSV(text)
          const uniqueNames = [...new Set(
            parsed.map(r => r.categoryName).filter((n): n is string => !!n),
          )]
          const nameToId = new Map<string, string>()
          for (const name of uniqueNames) {
            const id = await getOrCreateCategoryByName(name, dek)
            if (id) nameToId.set(name, id)
          }
          inputs = parsed.map(({ categoryName, ...row }) => ({
            ...row,
            category_id: categoryName ? (nameToId.get(categoryName) ?? null) : null,
          }))
        } else {
          let parsed: unknown
          try { parsed = JSON.parse(text) } catch { toast.error('Invalid JSON file'); return }
          if (!Array.isArray(parsed)) { toast.error('JSON file must be an array'); return }
          inputs = (parsed as ImportLinkInput[]).filter(item => typeof item?.url === 'string')
        }
      }

      if (inputs.length === 0) { toast.error('No valid links found'); return }

      const result = await importLinks(
        inputs, catId, dek,
        (done, total) => setProgress({ phase: 'links', done, total }),
      )
      setLastResult(result)
      if (result.imported > 0) {
        setUrlsText('')
        setJsonText('')
        setSelectedFile(null)
        refetchTags()
        const dupSuffix = result.duplicates > 0 ? ` (${result.duplicates} already existed)` : ''
        toast.success(`Imported ${result.imported} link${result.imported !== 1 ? 's' : ''}${dupSuffix}`)
      } else {
        const parts: string[] = []
        if (result.duplicates > 0) parts.push(`${result.duplicates} already existed`)
        if (result.skipped > 0) parts.push(`${result.skipped} invalid`)
        toast.warning(`No links imported${parts.length > 0 ? ` — ${parts.join(', ')}` : ''}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      setProgress(null)
    }
  }

  return {
    importTab, switchTab,
    isDragging, selectedFile,
    urlsText, setUrlsText,
    jsonText, setJsonText,
    defaultCategoryId, setDefaultCategoryId,
    categories,
    importing, lastResult, progress,
    detectedVaultExport, vaultExportError,
    applyPreferences, setApplyPreferences,
    fileInputRef,
    hasImportContent,
    handleDragOver, handleDragLeave, handleDrop, handleFileChange,
    handleImport,
  }
}
