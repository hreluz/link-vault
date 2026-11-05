import { createClient } from '@/lib/supabase/client'

/** Keeps each `.in()` filter, and so each request URL, a reasonable size on large imports. */
const BATCH_SIZE = 200

function batches<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) out.push(items.slice(i, i + BATCH_SIZE))
  return out
}

/** Hard-deletes the given links in batches of 200, favorites included (this is the one place
 *  that skips `deleteLink`'s favorite rule: the import file favorited them, not the user).
 *  `link_tags` rows go with them through the FK cascade.
 *  Returns how many were deleted, or null on failure. Ids that are already gone are ignored,
 *  so calling it again after a partial failure is safe. */
export async function deleteImportedLinks(ids: string[]): Promise<number | null> {
  const supabase = createClient()
  let deleted = 0
  for (const batch of batches(ids)) {
    const { data, error } = await supabase.from('links').delete().in('id', batch).select('id')
    if (error) return null
    deleted += data?.length ?? 0
  }
  return deleted
}

/** The subset of `ids` that `fetchBatch` still finds referenced; null on failure. */
async function referencedIds(
  ids: string[],
  fetchBatch: (batch: string[]) => PromiseLike<{ data: (string | null)[] | null; error: unknown }>,
): Promise<Set<string> | null> {
  const used = new Set<string>()
  for (const batch of batches(ids)) {
    const { data, error } = await fetchBatch(batch)
    if (error) return null
    for (const id of data ?? []) if (id) used.add(id)
  }
  return used
}

/** Tags still on any link. `link_tags` has no `deleted_at`, so links in Trash count. */
function tagsInUse(tagIds: string[]) {
  const supabase = createClient()
  return referencedIds(tagIds, async batch => {
    const { data, error } = await supabase.from('link_tags').select('tag_id').in('tag_id', batch)
    return { data: data?.map(row => row.tag_id) ?? null, error }
  })
}

/** Categories still on any link, with no `deleted_at` filter, so links in Trash count. */
function categoriesInUse(categoryIds: string[]) {
  const supabase = createClient()
  return referencedIds(categoryIds, async batch => {
    const { data, error } = await supabase.from('links').select('category_id').in('category_id', batch)
    return { data: data?.map(row => row.category_id) ?? null, error }
  })
}

async function deleteRows(table: 'tags' | 'categories', ids: string[]): Promise<number | null> {
  const supabase = createClient()
  let deleted = 0
  for (const batch of batches(ids)) {
    const { data, error } = await supabase.from(table).delete().in('id', batch).select('id')
    if (error) return null
    deleted += data?.length ?? 0
  }
  return deleted
}

/** Deletes the given tags and categories that no link (active or in Trash) still references.
 *  Deleting a category also removes its domain rules (FK cascade).
 *  Returns what was removed, or null on failure. */
export async function removeUnusedImportCreations(
  created: { tagIds: string[]; categoryIds: string[] },
): Promise<{ tags: number; categories: number } | null> {
  const [usedTags, usedCategories] = await Promise.all([
    created.tagIds.length > 0 ? tagsInUse(created.tagIds) : new Set<string>(),
    created.categoryIds.length > 0 ? categoriesInUse(created.categoryIds) : new Set<string>(),
  ])
  if (!usedTags || !usedCategories) return null

  const unusedTags = created.tagIds.filter(id => !usedTags.has(id))
  const unusedCategories = created.categoryIds.filter(id => !usedCategories.has(id))

  const [tags, categories] = await Promise.all([
    unusedTags.length > 0 ? deleteRows('tags', unusedTags) : 0,
    unusedCategories.length > 0 ? deleteRows('categories', unusedCategories) : 0,
  ])
  if (tags === null || categories === null) return null
  return { tags, categories }
}
