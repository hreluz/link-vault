'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { importLinks, type ImportLinkInput } from '@/lib/services/links'
import { getOrCreateCategoryByName } from '@/lib/services/categories'
import { useVault } from '@/lib/context/VaultContext'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { parseCSV } from '@/lib/utils/linksCsv'

export type ImportTab = 'urls' | 'json' | 'file'

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
  const [lastResult, setLastResult] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (categories.length > 0 && !defaultCategorySet.current) {
      const notDefined = categories.find(c => c.name === 'Not defined')
      setDefaultCategoryId((notDefined ?? categories[0]).id)
      defaultCategorySet.current = true
    }
  }, [categories])

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

  async function handleImport() {
    if (!dek) return
    setImporting(true)
    setLastResult(null)
    const catId = defaultCategoryId || null

    try {
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
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(selectedFile)
        })
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

      const result = await importLinks(inputs, catId, dek)
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
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return {
    importTab, switchTab,
    isDragging, selectedFile,
    urlsText, setUrlsText,
    jsonText, setJsonText,
    defaultCategoryId, setDefaultCategoryId,
    categories,
    importing, lastResult,
    fileInputRef,
    hasImportContent,
    handleDragOver, handleDragLeave, handleDrop, handleFileChange,
    handleImport,
  }
}
