import type { LinkWithTags, ImportLinkInput } from '@/lib/services/links'

export type ParsedRow = ImportLinkInput & { categoryName?: string }

export function linksToCSV(
  links: LinkWithTags[],
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

export function parseCSV(text: string): ParsedRow[] {
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
