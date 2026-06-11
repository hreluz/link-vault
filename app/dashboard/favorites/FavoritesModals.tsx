'use client'

import FilterSheet from '../link/FilterSheet'
import EditLinkModal from '../link/EditLinkModal'
import BottomSheet from '../link/BottomSheet'
import { useFavoritesContext } from './FavoritesContext'

export default function FavoritesModals() {
  const {
    categories, results, allTags,
    filterOpen, setFilterOpen,
    sortBy, setSortBy,
    category, setCategory,
    selectedTags, setSelectedTags,
    tagMode, setTagMode,
    activeLink, setActiveLink,
    editingLink, setEditingLink,
    resetFilters,
    handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle,
  } = useFavoritesContext()

  return (
    <>
      <FilterSheet
        isOpen={filterOpen}
        sortBy={sortBy}
        category={category}
        categories={categories}
        selectedTags={selectedTags}
        tagMode={tagMode}
        allTags={allTags}
        resultCount={results.length}
        onSortChange={setSortBy}
        onCategoryChange={setCategory}
        onTagsChange={setSelectedTags}
        onTagModeChange={setTagMode}
        onReset={resetFilters}
        onClose={() => setFilterOpen(false)}
      />

      <EditLinkModal
        key={editingLink?.id}
        link={editingLink}
        onSave={updated => { handleEdit(updated); setEditingLink(null) }}
        onClose={() => setEditingLink(null)}
      />

      <BottomSheet
        link={activeLink}
        onStatusChange={(id, status) => { handleStatusChange(id, status); setActiveLink(null) }}
        onFavoriteToggle={() => activeLink && handleFavoriteToggle(activeLink.id)}
        onEdit={() => setEditingLink(activeLink)}
        onDelete={() => { if (activeLink) handleDelete(activeLink.id); setActiveLink(null) }}
        onClose={() => setActiveLink(null)}
      />
    </>
  )
}
