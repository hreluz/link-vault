'use client'

import type { LinkFilterParams } from '@/lib/services/links'
import { useVault } from '@/lib/context/VaultContext'
import { useLinkListQuery } from './useLinkListQuery'
import { useLinkMutations } from './useLinkMutations'
import { useLinkBulkMutations } from './useLinkBulkMutations'

export function useLinks(filterParams: LinkFilterParams) {
  const { dek } = useVault()
  const { links, rawLinks, setRawLinks, totalCount, hasMore, loading, loadingMore, loadMore } =
    useLinkListQuery(filterParams, dek)
  const mutations = useLinkMutations(rawLinks, setRawLinks, filterParams)
  const bulkMutations = useLinkBulkMutations(rawLinks, setRawLinks, filterParams, dek)

  return {
    links, totalCount, hasMore, loading, loadingMore, loadMore,
    ...mutations,
    ...bulkMutations,
  }
}
