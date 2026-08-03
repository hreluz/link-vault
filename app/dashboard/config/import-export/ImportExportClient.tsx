'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { getLinks } from '@/lib/services/links'
import { importLinks, type ImportLinkInput } from '@/lib/services/links'
import { getCategories, getOrCreateCategoryByName } from '@/lib/services/categories'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { useVault } from '@/lib/context/VaultContext'

type ImportTab = 'urls' | 'json' | 'file'
type ParsedRow = ImportLinkInput & { categoryName?: string }

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function linksToCSV(
  links: Awaited<ReturnType<typeof getLinks>>,
  categoryMap: Map<string, string>,
  tagNameById: Map<string, string>,
): string {
  const header = 'url,title,site_name,category,status,is_favorite,notes,tags,created_at'
  const escape = (val: string | null | undefined) => {
    if (val == null) return ''
    const s = String(val)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const rows = links.map(l =>
    [
      escape(l.url),
      escape(l.title),
      escape(l.site_name),
      escape(l.category_id ? (categoryMap.get(l.category_id) ?? '') : ''),
      escape(l.status),
      l.is_favorite ? 'true' : 'false',
      escape(l.notes),
      escape(l.tags.map(id => tagNameById.get(id) ?? id).join('|')),
      escape(l.created_at),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

function splitCSVLine(line: string): string[] {
  const cols: string[] = []
  let i = 0
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = ''
      i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { field += line[i++] }
      }
      cols.push(field)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { cols.push(line.slice(i)); break }
      cols.push(line.slice(i, end))
      i = end + 1
    }
  }
  return cols
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCSVLine(lines[0])
  const urlIdx = headers.indexOf('url')
  const titleIdx = headers.indexOf('title')
  const notesIdx = headers.indexOf('notes')
  const tagsIdx = headers.indexOf('tags')
  const categoryIdx = headers.indexOf('category')
  if (urlIdx === -1) return []

  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line)
    return {
      url: cols[urlIdx] ?? '',
      title: titleIdx !== -1 ? cols[titleIdx] || null : null,
      notes: notesIdx !== -1 ? cols[notesIdx] || null : null,
      tags: tagsIdx !== -1 ? (cols[tagsIdx]?.split('|').filter(Boolean) ?? []) : [],
      categoryName: categoryIdx !== -1 ? cols[categoryIdx] || undefined : undefined,
    }
  }).filter(r => r.url)
}

export default function ImportExportClient() {
  const { dek } = useVault()
  const { refetchTags } = useTagsContext()
  const tagNameById = useTagNameLookup()
  const [importTab, setImportTab] = useState<ImportTab>('urls')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [urlsText, setUrlsText] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('')
  const defaultCategorySet = useRef(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null)
  const [lastResult, setLastResult] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { categories } = useCategoryList()

  useEffect(() => {
    if (categories.length > 0 && !defaultCategorySet.current) {
      const notDefined = categories.find(c => c.name === 'Not defined')
      setDefaultCategoryId((notDefined ?? categories[0]).id)
      defaultCategorySet.current = true
    }
  }, [categories])

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

  const TAB_LABELS: Record<ImportTab, string> = {
    urls: '🔗 Paste URLs',
    json: '📋 Paste JSON',
    file: '📁 Upload file',
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 transition hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-surface-900 dark:text-surface-50">Import & Export</h1>

      {/* ── Export ── */}
      <section className="mb-6 rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-900/30">
            📤
          </span>
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50">Export</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">Download all your links as a file</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-card px-5 py-2.5 text-sm font-medium text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100"
          >
            <span aria-hidden="true">📄</span>
            {exporting === 'json' ? 'Exporting…' : 'Export as JSON'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-card px-5 py-2.5 text-sm font-medium text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100"
          >
            <span aria-hidden="true">📊</span>
            {exporting === 'csv' ? 'Exporting…' : 'Export as CSV'}
          </button>
        </div>

        <p className="mt-4 text-xs text-surface-400 dark:text-surface-500">
          JSON preserves all fields including tags and notes. CSV is compatible with spreadsheet apps.
        </p>
      </section>

      {/* ── Import ── */}
      <section className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-xl dark:bg-primary-900/30">
            📥
          </span>
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50">Import</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">Add links from URLs, JSON, or a file</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex rounded-xl border border-surface-200 p-1 dark:border-surface-700">
          {(['urls', 'json', 'file'] as ImportTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setImportTab(tab); setLastResult(null) }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                importTab === tab
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {importTab === 'urls' && (
          <div className="space-y-2">
            <p className="text-xs text-surface-500 dark:text-surface-400">
              One URL per line — all imported as <span className="font-medium text-surface-700 dark:text-surface-300">unread</span> with <span className="font-mono text-xs">#no-tag</span>
            </p>
            <textarea
              value={urlsText}
              onChange={e => setUrlsText(e.target.value)}
              placeholder={"https://example.com\nhttps://github.com/some/repo\nhttps://youtube.com/watch?v=..."}
              rows={10}
              className="w-full resize-none rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-300 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-600"
            />
          </div>
        )}

        {importTab === 'json' && (
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder={'[\n  {\n    "url": "https://example.com",\n    "title": "Example",\n    "tags": ["reading"],\n    "notes": "optional"\n  }\n]'}
            rows={10}
            className="w-full resize-none rounded-xl border border-surface-200 bg-surface-card px-4 py-3 font-mono text-sm text-surface-900 placeholder-surface-300 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-600"
          />
        )}

        {importTab === 'file' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              isDragging
                ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                : selectedFile
                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:border-surface-600 dark:hover:bg-surface-800'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <>
                <span className="text-3xl">✅</span>
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">{selectedFile.name}</p>
                  <p className="mt-0.5 text-sm text-emerald-600 dark:text-emerald-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB · click to change
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="text-4xl">📂</span>
                <div>
                  <p className="font-medium text-surface-700 dark:text-surface-300">Drop your file here</p>
                  <p className="mt-0.5 text-sm text-surface-400 dark:text-surface-500">or click to browse — .json or .csv</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Category selector + import button */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Default category for imported links
            </label>
            <select
              value={defaultCategoryId}
              onChange={e => setDefaultCategoryId(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoticon ? `${cat.emoticon} ` : ''}{cat.name}
                </option>
              ))}
            </select>
          </div>

          {lastResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${lastResult.imported > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-surface-50 text-surface-600 dark:bg-surface-800 dark:text-surface-400'}`}>
              {lastResult.imported > 0
                ? `✅ ${lastResult.imported} link${lastResult.imported !== 1 ? 's' : ''} imported`
                : '⚠️ No links imported'}
              {lastResult.duplicates > 0 && ` · ${lastResult.duplicates} already existed`}
              {lastResult.skipped > 0 && ` · ${lastResult.skipped} invalid`}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!hasImportContent || importing}
            className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import links'}
          </button>
        </div>

        <p className="mt-4 text-xs text-surface-400 dark:text-surface-500">
          Importing will add new links. URLs already in your vault will be skipped.
        </p>
      </section>
    </main>
  )
}
