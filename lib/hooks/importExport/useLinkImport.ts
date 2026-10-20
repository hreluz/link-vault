'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  importLinks,
  type ImportLinkInput, type ImportFailure, type ImportRowOutcome, type HostBlockInfo, type HostBlockDecision,
  type ThrottleWait, type ImportFetching,
} from '@/lib/services/links'
import { getOrCreateCategoryByName, PROTECTED_CATEGORY_NAME } from '@/lib/services/categories'
import { getCategoryIdByDomainMap, lookupCategoryIdByUrl } from '@/lib/services/category-domains'
import { toKebabCase } from '@/lib/services/tags/tags'
import { importVaultExport, type VaultImportResult, type VaultImportProgress } from '@/lib/services/importExport/importVault'
import { simulateImportMs, type EstimateRow } from '@/lib/services/importExport/importEstimate'
import { isVaultExportV2, getVaultExportValidationError, type VaultExportV2 } from '@/lib/types/importExport'
import { useVault } from '@/lib/context/VaultContext'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { parseCSV, type ParsedRow } from '@/lib/utils/linksCsv'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'
import { useImportEta } from '@/lib/hooks/importExport/useImportEta'
import { createClient } from '@/lib/supabase/client'
import {
  getImportFetchSettings, DEFAULT_IMPORT_FETCH_SETTINGS, type ImportFetchSettings,
} from '@/lib/services/appSettings'

export type ImportTab = 'urls' | 'json' | 'file'

export type ImportStats = {
  imported: number
  duplicates: number
  failed: number
  metaMissing: number
  failures: ImportFailure[]
  /** URLs left out because the site returned a generic page with no metadata. */
  genericSkipped: string[]
}
export type ImportModalState = 'closed' | 'running' | 'finished' | 'cancelled' | 'error'
/** Fixed at the start of an import, since the inputs it was derived from are cleared on success. */
export type ImportRun = { isVault: boolean; withMetadata: boolean }
/** A host that looks blocked while the import is paused; `retryAt` is set during the countdown. */
export type HostBlockState = HostBlockInfo & { retryAt: number | null }

const EMPTY_STATS: ImportStats = { imported: 0, duplicates: 0, failed: 0, metaMissing: 0, failures: [], genericSkipped: [] }

function applyOutcome(stats: ImportStats, outcome: ImportRowOutcome): ImportStats {
  switch (outcome.status) {
    case 'imported':
      return { ...stats, imported: stats.imported + 1, metaMissing: stats.metaMissing + (outcome.metaMissing ? 1 : 0) }
    case 'duplicate':
      return { ...stats, duplicates: stats.duplicates + 1 }
    case 'failed':
      return {
        ...stats,
        failed: stats.failed + 1,
        failures: [...stats.failures, { url: outcome.url, reason: outcome.reason }],
      }
    case 'skipped_generic':
      return { ...stats, genericSkipped: [...stats.genericSkipped, outcome.url] }
  }
}

export type ImportLastResult = { imported: number; skipped: number; duplicates: number; metaMissing?: number } & Partial<
  Pick<VaultImportResult, 'categoriesCreated' | 'domainsCreated' | 'domainsFailed' | 'tagsCreated' | 'preferencesFailed'>
>

async function readFileText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function resolveCsvCategories(rows: ParsedRow[], dek: CryptoKey): Promise<ImportLinkInput[]> {
  const uniqueNames = [...new Set(rows.map(r => r.categoryName).filter((n): n is string => !!n))]
  const nameToId = new Map<string, string>()
  for (const name of uniqueNames) {
    const id = await getOrCreateCategoryByName(name, dek)
    if (id) nameToId.set(name, id)
  }
  return rows.map(({ categoryName, ...row }) => ({
    ...row,
    category_id: categoryName ? (nameToId.get(categoryName) ?? null) : null,
  }))
}

/** Gives rows with no category of their own the category of their URL's domain rule, if any.
 *  Rows still left without one fall back to the default selector inside importLinks. */
async function applyDomainCategories(inputs: ImportLinkInput[], dek: CryptoKey): Promise<ImportLinkInput[]> {
  let map: Map<string, string>
  try {
    map = await getCategoryIdByDomainMap(dek)
  } catch {
    return inputs
  }
  return inputs.map(input => {
    if (input.category_id) return input
    const categoryId = lookupCategoryIdByUrl(input.url, map)
    return categoryId ? { ...input, category_id: categoryId } : input
  })
}

/** Row tags followed by the import tags, de-duplicated by kebab-case name, first occurrence kept.
 *  Returns inputs unchanged when importTags parses to an empty list. */
function applyImportTags(inputs: ImportLinkInput[], importTags: string): ImportLinkInput[] {
  const extra = importTags.split(',').map(t => t.trim()).filter(Boolean)
  if (extra.length === 0) return inputs
  return inputs.map(input => {
    const seen = new Set<string>()
    const tags = [...(input.tags ?? []), ...extra].filter(tag => {
      const key = toKebabCase(tag)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    return { ...input, tags }
  })
}

type VaultExportDetection = { data: VaultExportV2 | null; error: string | null }

/** The admin's import guard settings; the defaults on any failure, so a settings outage never blocks an import. */
async function readFetchSettings(): Promise<ImportFetchSettings> {
  try {
    return await getImportFetchSettings(createClient())
  } catch {
    return DEFAULT_IMPORT_FETCH_SETTINGS
  }
}

/** The rows a pasted JSON / uploaded file would import, for the pre-import estimate only. */
function previewRowsFromText(text: string, isCsv: boolean): EstimateRow[] {
  if (isCsv) return parseCSV(text)
  try {
    const parsed = JSON.parse(text)
    if (isVaultExportV2(parsed)) return parsed.links
    return Array.isArray(parsed) ? parsed.filter(item => typeof item?.url === 'string') : []
  } catch {
    return []
  }
}

/** Rows to import and how long they would take, assuming none already exist. */
export type ImportEstimate = { count: number; ms: number }

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
  // Comma-separated, added to every non-v2 row; kept between imports, empty on page load.
  const [importTags, setImportTags] = useState('')
  const [importing, setImporting] = useState(false)
  const [lastResult, setLastResult] = useState<ImportLastResult | null>(null)
  const [detectedVaultExport, setDetectedVaultExport] = useState<VaultExportV2 | null>(null)
  const [vaultExportError, setVaultExportError] = useState<string | null>(null)
  const [applyPreferences, setApplyPreferences] = useState(true)
  // Opt-in and deliberately not persisted: fetching makes imports much slower.
  const [autoFetchOnImport, setAutoFetchOnImport] = useState(false)
  const [progress, setProgress] = useState<VaultImportProgress | null>(null)
  const [importModalState, setImportModalState] = useState<ImportModalState>('closed')
  const [importStats, setImportStats] = useState<ImportStats>(EMPTY_STATS)
  const [importError, setImportError] = useState<string | null>(null)
  const [importRun, setImportRun] = useState<ImportRun | null>(null)
  // True from the Cancel click until the import returns (the current row still finishes).
  const [cancelling, setCancelling] = useState(false)
  const [notProcessed, setNotProcessed] = useState<string[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  // Set while a host looks blocked: the import is paused until one of the three choices resolves it.
  const [hostBlock, setHostBlock] = useState<HostBlockState | null>(null)
  const hostBlockResolverRef = useRef<((decision: HostBlockDecision) => void) | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Set while the import waits out a same-host gap of >= 1 s before the next fetch.
  const [throttleWait, setThrottleWait] = useState<ThrottleWait | null>(null)
  // Set while a link's metadata fetch is in flight.
  const [fetching, setFetching] = useState<ImportFetching | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Only file contents need reading asynchronously; the text tabs are derived during render.
  const [fileRows, setFileRows] = useState<EstimateRow[]>([])
  const eta = useImportEta(hostBlock !== null)
  // Latest known admin settings, for the pre-import estimate; refreshed at each import start.
  const [fetchSettings, setFetchSettings] = useState<ImportFetchSettings>(DEFAULT_IMPORT_FETCH_SETTINGS)
  // The snapshot the running import uses from start to finish (null when no import has started).
  const [runFetchSettings, setRunFetchSettings] = useState<ImportFetchSettings | null>(null)
  const runFetchSettingsRef = useRef<ImportFetchSettings>(DEFAULT_IMPORT_FETCH_SETTINGS)

  useEffect(() => {
    let cancelled = false
    readFetchSettings().then(settings => { if (!cancelled) setFetchSettings(settings) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (categories.length > 0 && !defaultCategorySet.current) {
      const notDefined = categories.find(c => c.name === PROTECTED_CATEGORY_NAME)
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
      if (importTab === 'file' && selectedFile) {
        const text = await readFileText(selectedFile)
        const isCsv = selectedFile.name.endsWith('.csv')
        if (!cancelled) setFileRows(previewRowsFromText(text, isCsv))
        apply(isCsv ? { data: null, error: null } : tryDetectVaultExport(text))
        return
      }
      setFileRows([])
      apply({ data: null, error: null })
    }

    detect()
    return () => { cancelled = true }
  }, [importTab, jsonText, selectedFile])

  // The modal can't stop a refresh, and a refresh cuts the import halfway.
  useEffect(() => {
    if (!importing) return
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [importing])

  function closeImportModal() {
    setImportModalState(state => (state === 'running' ? state : 'closed'))
  }

  function cancelImport() {
    if (importModalState !== 'running') return
    abortControllerRef.current?.abort()
    setCancelling(true)
  }

  function clearRetryTimer() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryTimerRef.current = null
  }

  /** Ends the pause with `decision`. Uses only refs and setters, so it is safe from a timer callback. */
  function resolveHostBlock(decision: HostBlockDecision) {
    clearRetryTimer()
    const resolve = hostBlockResolverRef.current
    hostBlockResolverRef.current = null
    setHostBlock(null)
    resolve?.(decision)
  }

  function handleHostBlocked(info: HostBlockInfo): Promise<HostBlockDecision> {
    setHostBlock({ ...info, retryAt: null })
    return new Promise(resolve => { hostBlockResolverRef.current = resolve })
  }

  function waitAndRetry() {
    if (!hostBlockResolverRef.current || retryTimerRef.current) return
    const retryWaitMs = runFetchSettingsRef.current.retryWaitSeconds * 1000
    const retryAt = Date.now() + retryWaitMs
    setHostBlock(block => block && { ...block, retryAt })
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      resolveHostBlock('retry')
    }, retryWaitMs)
  }

  function skipBlockedHost() {
    if (!hostBlockResolverRef.current) return
    if (hostBlock) eta.skipGroup(hostBlock.host)
    resolveHostBlock('skip_host')
  }

  function leaveImport() {
    if (!hostBlockResolverRef.current) return
    cancelImport()
    resolveHostBlock('cancel')
  }

  // Unmounting mid-pause must not leave a timer behind or the import awaiting forever.
  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (hostBlockResolverRef.current) {
      abortControllerRef.current?.abort()
      hostBlockResolverRef.current('cancel')
      hostBlockResolverRef.current = null
    }
  }, [])

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

  const previewRows = useMemo<EstimateRow[]>(() => {
    if (importTab === 'urls') return urlsText.split('\n').map(l => l.trim()).filter(Boolean).map(url => ({ url }))
    if (importTab === 'json') return previewRowsFromText(jsonText, false)
    return fileRows
  }, [importTab, urlsText, jsonText, fileRows])

  const importEstimate = useMemo<ImportEstimate | null>(() => {
    if (previewRows.length === 0) return null
    // Vault exports never fetch metadata (the switch is disabled for them).
    const withMetadata = autoFetchOnImport && !detectedVaultExport
    const gapMs = fetchSettings.fetchGapSeconds * 1000
    return { count: previewRows.length, ms: simulateImportMs(previewRows, { withMetadata, gapMs }) }
  }, [previewRows, autoFetchOnImport, detectedVaultExport, fetchSettings])

  function handleProgress(p: VaultImportProgress) {
    setProgress(p)
    if (p.phase === 'links') eta.recordProgress(p.done, p.outcome)
    const outcome = p.outcome
    if (outcome) setImportStats(stats => applyOutcome(stats, outcome))
  }

  async function handleImport() {
    if (!dek) return
    if (vaultExportError) { toast.error(vaultExportError); return }
    setImporting(true)
    setLastResult(null)
    setProgress(null)
    const catId = defaultCategoryId || null
    let modalOpened = false

    // Called only once pre-flight validation has passed, just before the first write.
    function openModal(run: ImportRun) {
      modalOpened = true
      abortControllerRef.current = new AbortController()
      setImportRun(run)
      setImportStats(EMPTY_STATS)
      setImportError(null)
      setNotProcessed([])
      setImportModalState('running')
      return abortControllerRef.current.signal
    }

    try {
      // ── full-vault (v2) export detected on the json/file tab ──────────
      if (detectedVaultExport) {
        const signal = openModal({ isVault: true, withMetadata: false })
        eta.start(detectedVaultExport.links, false)
        const result = await importVaultExport(
          detectedVaultExport,
          { defaultCategoryId: catId, applyPreferences, onProgress: handleProgress, signal },
          dek,
        )
        setLastResult(result)
        if (result.imported > 0) refetchTags()
        if (result.cancelled) {
          // Inputs are kept so re-running the same import continues where it stopped.
          setNotProcessed(result.notProcessed)
          setImportModalState('cancelled')
          return
        }
        if (result.imported > 0) {
          setJsonText('')
          setSelectedFile(null)
        }
        setImportModalState('finished')
        return
      }

      let inputs: ImportLinkInput[] = []
      let csvRows: ParsedRow[] | null = null

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
          csvRows = parseCSV(text)
          inputs = csvRows
        } else {
          let parsed: unknown
          try { parsed = JSON.parse(text) } catch { toast.error('Invalid JSON file'); return }
          if (!Array.isArray(parsed)) { toast.error('JSON file must be an array'); return }
          inputs = (parsed as ImportLinkInput[]).filter(item => typeof item?.url === 'string')
        }
      }

      if (inputs.length === 0) { toast.error('No valid links found'); return }

      const signal = openModal({ isVault: false, withMetadata: autoFetchOnImport })
      // CSV category names are created here, so this runs after the modal opens ("Preparing…").
      if (csvRows) inputs = await resolveCsvCategories(csvRows, dek)
      inputs = await applyDomainCategories(inputs, dek)
      inputs = applyImportTags(inputs, importTags)
      // Snapshot: this run keeps these values even if the admin changes them mid-import.
      const settings = await readFetchSettings()
      runFetchSettingsRef.current = settings
      setRunFetchSettings(settings)
      setFetchSettings(settings)
      const gapMs = settings.fetchGapSeconds * 1000
      eta.start(inputs, autoFetchOnImport, gapMs)

      const result = await importLinks(
        inputs, catId, dek,
        {
          onProgress: (done, total, outcome) => handleProgress({ phase: 'links', done, total, outcome }),
          fetchMeta: autoFetchOnImport ? fetchLinkMeta : undefined,
          onHostBlocked: autoFetchOnImport ? handleHostBlocked : undefined,
          onThrottleWait: autoFetchOnImport ? setThrottleWait : undefined,
          onFetching: autoFetchOnImport ? setFetching : undefined,
          guardConfig: { gapMs, emptyStreakLimit: settings.emptyStreakLimit },
          signal,
          titleFromUrl: true,
        },
      )
      setLastResult(result)
      if (result.imported > 0) refetchTags()
      if (result.cancelled) {
        // Inputs are kept so re-running the same import continues where it stopped.
        setNotProcessed(result.notProcessed)
        setImportModalState('cancelled')
        return
      }
      if (result.imported > 0) {
        setUrlsText('')
        setJsonText('')
        setSelectedFile(null)
      }
      setImportModalState('finished')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      if (modalOpened) {
        setImportError(message)
        setImportModalState('error')
      } else {
        toast.error(message)
      }
    } finally {
      abortControllerRef.current = null
      clearRetryTimer()
      hostBlockResolverRef.current = null
      setHostBlock(null)
      setThrottleWait(null)
      setFetching(null)
      eta.stop()
      setImporting(false)
      setCancelling(false)
      setProgress(null)
    }
  }

  // The modal shows the running import's values; between imports, the latest known ones.
  const shownFetchSettings = runFetchSettings ?? fetchSettings

  return {
    importTab, switchTab,
    isDragging, selectedFile,
    urlsText, setUrlsText,
    jsonText, setJsonText,
    defaultCategoryId, setDefaultCategoryId,
    importTags, setImportTags,
    categories,
    importing, lastResult, progress,
    detectedVaultExport, vaultExportError,
    applyPreferences, setApplyPreferences,
    autoFetchOnImport, setAutoFetchOnImport,
    importEstimate, importEtaMs: eta.etaMs,
    importModalState, importStats, importError, importRun, closeImportModal,
    cancelling, notProcessed, cancelImport,
    hostBlock, waitAndRetry, skipBlockedHost, leaveImport,
    throttleWait,
    fetching,
    retryWaitMs: shownFetchSettings.retryWaitSeconds * 1000,
    emptyStreakLimit: shownFetchSettings.emptyStreakLimit,
    fileInputRef,
    hasImportContent,
    handleDragOver, handleDragLeave, handleDrop, handleFileChange,
    handleImport,
  }
}
