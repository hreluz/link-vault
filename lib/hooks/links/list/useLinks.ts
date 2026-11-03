'use client'

import type { LinkFilterParams } from '@/lib/services/links'
import { useVault } from '@/lib/context/VaultContext'
import { useLinkListQuery } from './useLinkListQuery'
import { useLinkMutations } from './useLinkMutations'
import { useCardImageRefresh } from './useCardImageRefresh'

export function useLinks(filterParams: LinkFilterParams) {
  const { dek } = useVault()
  const {
    links, loadedLinks, rawLinks, setRawLinks, totalCount, unreadCount, hasMore, loading, loadingMore, loadMore, refresh, refreshing,
    error, retry, shiftServerOffset,
  } = useLinkListQuery(filterParams, dek)
  // A saved move takes one loaded link out of the server order ahead of the next page;
  // a saved undo puts it back.
  const mutations = useLinkMutations(rawLinks, setRawLinks, filterParams, {
    onMovedToEnd: () => shiftServerOffset(-1),
    onMoveUndone: () => shiftServerOffset(1),
  })
  const { imageStateById, handleImageError } = useCardImageRefresh({ links: loadedLinks, setRawLinks, dek })

  return {
    links, loadedLinks, totalCount, unreadCount, hasMore, loading, loadingMore, loadMore, refresh, refreshing,
    error, retry,
    imageStateById, handleImageError,
    ...mutations,
  }
}
