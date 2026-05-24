'use client'

import { useLinkListContext } from './LinkListContext'
import AddLinkModal from './AddLinkModal'
import EditLinkModal from './EditLinkModal'
import FilterSheet from './FilterSheet'
import BottomSheet from './BottomSheet'

export default function LinkModals() {
  const {
    modalOpen, setModalOpen,
    filterOpen, setFilterOpen,
    editingLink, setEditingLink,
    activeLink, setActiveLink,
    sortBy, setSortBy,
    category, setCategory,
    selectedStatuses, setSelectedStatuses,
    selectedTags, setSelectedTags,
    tagMode, setTagMode,
    allTags,
    results,
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
        selectedStatuses={selectedStatuses}
        selectedTags={selectedTags}
        tagMode={tagMode}
        allTags={allTags}
        resultCount={results.length}
        onSortChange={setSortBy}
        onCategoryChange={setCategory}
        onStatusesChange={setSelectedStatuses}
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
