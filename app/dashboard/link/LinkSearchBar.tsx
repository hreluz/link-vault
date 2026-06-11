'use client'

import SearchBar from '@/components/SearchBar'
import { useLinkListContext } from './LinkListContext'

export default function LinkSearchBar() {
  const { searchQuery, isHashTagSearch, activeFilterCount, setSearchQuery, setFilterOpen } = useLinkListContext()
  return (
    <SearchBar
      value={searchQuery}
      onChange={setSearchQuery}
      isHashTagSearch={isHashTagSearch}
      filterCount={activeFilterCount}
      onFilterOpen={() => setFilterOpen(true)}
    />
  )
}
