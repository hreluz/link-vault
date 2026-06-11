'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

type ImportTab = 'file' | 'paste'

export default function ImportExportClient() {
  const [importTab, setImportTab] = useState<ImportTab>('file')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const hasImportContent = importTab === 'file' ? !!selectedFile : pasteText.trim().length > 0

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-slate-50">Import & Export</h1>

      {/* ── Export ── */}
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-900/30">
            📤
          </span>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">Export</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Download all your links as a file</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100">
            <span aria-hidden="true">📄</span>
            Export as JSON
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100">
            <span aria-hidden="true">📊</span>
            Export as CSV
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          JSON preserves all fields including tags and notes. CSV is compatible with spreadsheet apps.
        </p>
      </section>

      {/* ── Import ── */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xl dark:bg-indigo-900/30">
            📥
          </span>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">Import</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Restore links from a JSON or CSV file</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
          {(['file', 'paste'] as ImportTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setImportTab(tab)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                importTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'file' ? '📁 Upload file' : '📋 Paste JSON'}
            </button>
          ))}
        </div>

        {importTab === 'file' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20'
                : selectedFile
                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800'
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
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    Drop your file here
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
                    or click to browse — .json or .csv
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={'[\n  {\n    "url": "https://example.com",\n    "title": "Example",\n    "tags": ["reading"]\n  }\n]'}
            rows={9}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-300 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-600"
          />
        )}

        {/* Default category & import button */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default category for imported links
            </label>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option>General</option>
            </select>
          </div>

          <button
            disabled={!hasImportContent}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Import links
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Importing will add new links. Existing links won't be duplicated.
        </p>
      </section>
    </main>
  )
}
