import type { ImportLinkInput } from '@/lib/services/links'
import type { ExportedLink } from '@/lib/types/importExport'
import type { LinkStatus } from '@/lib/types/database'

export type ParsedRow = ImportLinkInput & { categoryName?: string }

const LINK_STATUSES: LinkStatus[] = ['unread', 'watching', 'read', 'archived']
function isLinkStatus(value: string): value is LinkStatus {
  return (LINK_STATUSES as string[]).includes(value)
}

const CSV_HEADER = 'url,title,description,site_name,image_url,duration,category,status,is_favorite,notes,tags,created_at,updated_at'

export function linksToCSV(links: ExportedLink[]): string {
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

export function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCSVLine(lines[0])
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

  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line)
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
    }
  }).filter(r => r.url)
}
