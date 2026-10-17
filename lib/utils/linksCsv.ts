import type { ImportLinkInput } from '@/lib/services/links'
import type { ExportedLink } from '@/lib/types/importExport'
import type { LinkStatus } from '@/lib/types/database'

export type ParsedRow = ImportLinkInput & { categoryName?: string }

const LINK_STATUSES: LinkStatus[] = ['unread', 'watching', 'read', 'archived']
function isLinkStatus(value: string): value is LinkStatus {
  return (LINK_STATUSES as string[]).includes(value)
}

const CSV_COLUMNS = [
  'url', 'title', 'description', 'site_name', 'image_url', 'duration', 'category',
  'status', 'is_favorite', 'notes', 'tags', 'created_at', 'updated_at',
] as const
type CsvColumn = typeof CSV_COLUMNS[number]
const CSV_HEADER = CSV_COLUMNS.join(',')

function escape(val: string | null | undefined): string {
  if (val == null) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function linksToCSV(links: ExportedLink[]): string {
  const rows = links.map(l =>
    [
      escape(l.url),
      escape(l.title),
      escape(l.description),
      escape(l.site_name),
      escape(l.image_url),
      escape(l.duration),
      escape(l.category),
      escape(l.status),
      l.is_favorite ? 'true' : 'false',
      escape(l.notes),
      escape(l.tags.join('|')),
      escape(l.created_at),
      escape(l.updated_at),
    ].join(','),
  )
  return [CSV_HEADER, ...rows].join('\n')
}

const TEMPLATE_FULL_ROW: ExportedLink = {
  url: 'https://example.com/article',
  title: 'An example article',
  description: 'A short summary of the article',
  site_name: 'example.com',
  image_url: 'https://example.com/cover.png',
  duration: '12:34',
  category: 'Article',
  status: 'read',
  is_favorite: true,
  notes: 'Worth re-reading, especially the second half',
  tags: ['reading', 'example'],
  created_at: '2026-01-15T10:00:00.000Z',
  updated_at: '2026-01-16T09:30:00.000Z',
}

// Only url/category/tags are filled, so the remaining columns read as optional. Built by
// column name (not via linksToCSV, which always writes status/is_favorite).
const TEMPLATE_MINIMAL_ROW: Partial<Record<CsvColumn, string>> = {
  url: 'https://github.com/some/repo',
  category: 'GitHub',
  tags: 'example|repo|open-source',
}

/** Example CSV for the import UI: the export header, one fully filled row, one minimal row. */
export function buildCsvTemplate(): string {
  const minimal = CSV_COLUMNS.map(col => escape(TEMPLATE_MINIMAL_ROW[col])).join(',')
  return [linksToCSV([TEMPLATE_FULL_ROW]), minimal].join('\n')
}

const MINIMAL_COLUMNS = ['url', 'category', 'tags'] as const satisfies readonly CsvColumn[]

/** Example CSV with only the columns most people fill in by hand: url, category, tags. */
export function buildMinimalCsvTemplate(): string {
  const row = MINIMAL_COLUMNS.map(col => escape(TEMPLATE_MINIMAL_ROW[col])).join(',')
  return [MINIMAL_COLUMNS.join(','), row].join('\n')
}

/** Tokenizes the whole text, so a quoted field may span lines. Records end on `\n` or `\r\n`;
 *  blank records are skipped. A `"` only opens a quoted field at the start of a field. */
function parseCSVRecords(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let inQuotes = false
  let fieldStart = true

  const endField = () => { record.push(field); field = ''; fieldStart = true }
  const endRecord = () => {
    endField()
    if (record.length > 1 || record[0] !== '') records.push(record)
    record = []
  }

  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2 }
      else if (ch === '"') { inQuotes = false; i++ }
      else { field += ch; i++ }
    } else if (ch === '"' && fieldStart) { inQuotes = true; fieldStart = false; i++ }
    else if (ch === ',') { endField(); i++ }
    else if (ch === '\r' && text[i + 1] === '\n') { endRecord(); i += 2 }
    else if (ch === '\n') { endRecord(); i++ }
    else { field += ch; fieldStart = false; i++ }
  }
  if (field !== '' || record.length > 0) endRecord()
  return records
}

export function parseCSV(text: string): ParsedRow[] {
  const records = parseCSVRecords(text)
  if (records.length < 2) return []
  // Forgiving header match: hand-made files often use `URL` or stray spaces.
  const headers = records[0].map(h => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name)
  const urlIdx = col('url')
  if (urlIdx === -1) return []
  const titleIdx = col('title')
  const descriptionIdx = col('description')
  const siteNameIdx = col('site_name')
  const imageUrlIdx = col('image_url')
  const durationIdx = col('duration')
  const notesIdx = col('notes')
  const tagsIdx = col('tags')
  const categoryIdx = col('category')
  const statusIdx = col('status')
  const favoriteIdx = col('is_favorite')
  const createdAtIdx = col('created_at')
  const updatedAtIdx = col('updated_at')

  return records.slice(1).map(cols => {
    const status = statusIdx !== -1 ? cols[statusIdx] : undefined
    return {
      url: cols[urlIdx] ?? '',
      title: titleIdx !== -1 ? cols[titleIdx] || null : null,
      description: descriptionIdx !== -1 ? cols[descriptionIdx] || null : null,
      site_name: siteNameIdx !== -1 ? cols[siteNameIdx] || null : null,
      image_url: imageUrlIdx !== -1 ? cols[imageUrlIdx] || null : null,
      duration: durationIdx !== -1 ? cols[durationIdx] || null : null,
      notes: notesIdx !== -1 ? cols[notesIdx] || null : null,
      tags: tagsIdx !== -1 ? (cols[tagsIdx]?.split('|').filter(Boolean) ?? []) : [],
      categoryName: categoryIdx !== -1 ? cols[categoryIdx] || undefined : undefined,
      status: status && isLinkStatus(status) ? status : undefined,
      is_favorite: favoriteIdx !== -1 ? cols[favoriteIdx] === 'true' : undefined,
      created_at: createdAtIdx !== -1 && cols[createdAtIdx] ? cols[createdAtIdx] : undefined,
      updated_at: updatedAtIdx !== -1 && cols[updatedAtIdx] ? cols[updatedAtIdx] : undefined,
    }
  }).filter(r => r.url)
}
