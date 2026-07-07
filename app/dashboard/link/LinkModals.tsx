'use client'

import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useAvailableTagsWithIds } from '@/lib/hooks/tags/useAvailableTags'
import { useLinkListContext } from './LinkListContext'
import AddLinkModal from './AddLinkModal'
import EditLinkModal from './EditLinkModal'
import FilterSheet from './FilterSheet'
import BottomSheet from './BottomSheet'

export default function LinkModals() {
  const { categories } = useCategoryList()
  const availableTags = useAvailableTagsWithIds()
  const {
    modalOpen, setModalOpen,
    filterOpen, setFilterOpen,
    editingLink, setEditingLink,
    activeLink, setActiveLink,
    sortBy, setSortBy,
    category, setCategory,
    selectedTagIds, setSelectedTagIds,
    tagMode, setTagMode,
    totalCount,
    handleCreate,
    handleEdit,
    handleDelete,
    handleStatusChange,
    handleFavoriteToggle,
    resetFilters,
    addToast,
  } = useLinkListContext()

  return (
    <>
      <AddLinkModal
        isOpen={modalOpen}
        onSuccess={link => { handleCreate(link); addToast('Link saved'); setModalOpen(false) }}
        onClose={() => setModalOpen(false)}
      />

      <EditLinkModal
        key={editingLink?.id}
        link={editingLink}
        onSave={handleEdit}
        onClose={() => setEditingLink(null)}
      />

      <FilterSheet
        isOpen={filterOpen}
        sortBy={sortBy}
        category={category}
        categories={categories}
        selectedTagIds={selectedTagIds}
        tagMode={tagMode}
        allTags={availableTags}
        resultCount={totalCount}
        onSortChange={setSortBy}
        onCategoryChange={setCategory}
        onTagsChange={setSelectedTagIds}
        onTagModeChange={setTagMode}
        onReset={resetFilters}
        onClose={() => setFilterOpen(false)}
      />

      <BottomSheet
        link={activeLink}
        onStatusChange={handleStatusChange}
        onFavoriteToggle={() => activeLink && handleFavoriteToggle(activeLink.id)}
        onEdit={() => setEditingLink(activeLink)}
        onDelete={handleDelete}
        onClose={() => setActiveLink(null)}
      />
    </>
  )
}
