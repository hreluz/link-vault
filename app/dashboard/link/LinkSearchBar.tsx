'use client'

import SearchBar from '@/components/SearchBar'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'
import { useLinkListContext } from './LinkListContext'

export default function LinkSearchBar() {
  const { searchQuery, isHashTagSearch, activeFilterCount, setSearchQuery, setFilterOpen } = useLinkListContext()
  const availableTags = useAvailableTags()
  return (
    <SearchBar
      value={searchQuery}
      onChange={setSearchQuery}
      isHashTagSearch={isHashTagSearch}
      filterCount={activeFilterCount}
      onFilterOpen={() => setFilterOpen(true)}
      availableTags={availableTags}
    />
  )
}
