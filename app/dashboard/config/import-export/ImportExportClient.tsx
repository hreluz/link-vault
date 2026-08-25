'use client'

import Link from 'next/link'
import { useLinkExport } from '@/lib/hooks/importExport/useLinkExport'
import { useLinkImport, type ImportTab } from '@/lib/hooks/importExport/useLinkImport'
import type { VaultImportPhase } from '@/lib/services/importExport/importVault'

const TAB_LABELS: Record<ImportTab, string> = {
  urls: '🔗 Paste URLs',
  json: '📋 Paste JSON',
  file: '📁 Upload file',
}

const PHASE_LABELS: Record<VaultImportPhase, string> = {
  categories: 'categories',
  domains: 'domain rules',
  tags: 'tags',
  links: 'links',
  preferences: 'appearance settings',
}

export default function ImportExportClient() {
  const { exporting, hasLockedPrivateTags, handleExport } = useLinkExport()
  const {
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
  } = useLinkImport()

  const showApplyPreferences = detectedVaultExport?.mode === 'everything' && !!detectedVaultExport.preferences

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
            <p className="text-sm text-surface-500 dark:text-surface-400">Download your links as a file</p>
          </div>
        </div>

        {hasLockedPrivateTags && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            🔒 Private tags are locked — links tagged private won&apos;t be included in any export. Unlock them first if you want them included.
          </p>
        )}

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">Quick — links &amp; tags</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleExport('links', 'json')}
                disabled={exporting !== null}
                className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-card px-5 py-2.5 text-sm font-medium text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100"
              >
                <span aria-hidden="true">📄</span>
                {exporting?.mode === 'links' && exporting.format === 'json' ? 'Exporting…' : 'Export as JSON'}
              </button>
              <button
                onClick={() => handleExport('links', 'csv')}
                disabled={exporting !== null}
                className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-card px-5 py-2.5 text-sm font-medium text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100"
              >
                <span aria-hidden="true">📊</span>
                {exporting?.mode === 'links' && exporting.format === 'csv' ? 'Exporting…' : 'Export as CSV'}
              </button>
            </div>
            <p className="mt-2 text-xs text-surface-400 dark:text-surface-500">
              Every link field (status, favorite, notes, timestamps…), its category, and its tags. JSON and CSV both work for moving to a new account.
            </p>
          </div>

          <div className="border-t border-surface-200 pt-4 dark:border-surface-700">
            <p className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">Everything — full backup</p>
            <button
              onClick={() => handleExport('everything', 'json')}
              disabled={exporting !== null}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">🗄️</span>
              {exporting?.mode === 'everything' ? 'Exporting…' : 'Export everything as JSON'}
            </button>
            <p className="mt-2 text-xs text-surface-400 dark:text-surface-500">
              Also includes category colors/emoji, domain auto-assign rules, tag colors and privacy, and appearance settings — a full clone for a new account.
            </p>
          </div>
        </div>
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
              onClick={() => switchTab(tab)}
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

        {vaultExportError && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {vaultExportError}
          </p>
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

          {showApplyPreferences && (
            <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
              <input
                type="checkbox"
                checked={applyPreferences}
                onChange={e => setApplyPreferences(e.target.checked)}
                className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/20"
              />
              Also apply appearance settings (theme, accent color) from this file
            </label>
          )}

          {lastResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${lastResult.imported > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-surface-50 text-surface-600 dark:bg-surface-800 dark:text-surface-400'}`}>
              {lastResult.imported > 0
                ? `✅ ${lastResult.imported} link${lastResult.imported !== 1 ? 's' : ''} imported`
                : '⚠️ No links imported'}
              {lastResult.duplicates > 0 && ` · ${lastResult.duplicates} already existed`}
              {lastResult.skipped > 0 && ` · ${lastResult.skipped} invalid`}
              {!!lastResult.categoriesCreated && ` · ${lastResult.categoriesCreated} categories`}
              {!!lastResult.tagsCreated && ` · ${lastResult.tagsCreated} tags`}
              {!!lastResult.domainsCreated && ` · ${lastResult.domainsCreated} domain rules`}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!hasImportContent || importing || !!vaultExportError}
            className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing
              ? progress
                ? `Importing… ${PHASE_LABELS[progress.phase]} (${progress.done}/${progress.total})`
                : 'Importing…'
              : 'Import links'}
          </button>
        </div>

        <p className="mt-4 text-xs text-surface-400 dark:text-surface-500">
          Importing will add new links. URLs already in your vault will be skipped.
        </p>
      </section>
    </main>
  )
}
