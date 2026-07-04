'use client'

import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'
import { useLinkListContext } from './LinkListContext'
import AddLinkModal from './AddLinkModal'
import EditLinkModal from './EditLinkModal'
import FilterSheet from './FilterSheet'
import BottomSheet from './BottomSheet'

export default function LinkModals() {
  const { categories } = useCategoryList()
  const availableTags = useAvailableTags()
  const {
    modalOpen, setModalOpen,
    filterOpen, setFilterOpen,
    editingLink, setEditingLink,
    activeLink, setActiveLink,
    sortBy, setSortBy,
    category, setCategory,
    selectedTags, setSelectedTags,
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
        selectedTags={selectedTags}
        tagMode={tagMode}
        allTags={availableTags}
        resultCount={totalCount}
        onSortChange={setSortBy}
        onCategoryChange={setCategory}
        onTagsChange={setSelectedTags}
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
