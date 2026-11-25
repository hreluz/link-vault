'use client'

import CollectionPickerSheet from '@/components/CollectionPickerSheet'
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
    handleStatusChange,
    resetFilters,
    addToast,
    pendingCapture, setPendingCapture,
    autoFetchDefault,
    pickerLink, pickerOrigin, openCollectionPicker, closeCollectionPicker,
    applyMembershipChange,
  } = useLinkListContext()

  // useDialog returns focus to the opener while it's still in the page; this is
  // the fallback. From "+N" that's "+N" (gone if unticks left 2 or fewer), else
  // the card's ··· button, which is also where the ··· menu path lands (SPEC 46).
  function pickerReturnTarget(): HTMLElement | null {
    if (!pickerLink) return null
    const card = document.querySelector(`[data-link-id="${CSS.escape(pickerLink.id)}"]`)
    if (!card) return null
    const more = pickerOrigin === 'more' ? card.querySelector<HTMLElement>('button[data-collections-more]') : null
    return more ?? card.querySelector<HTMLElement>('button[aria-label="Link options"]')
  }

  return (
    <>
      <AddLinkModal
        key={pendingCapture?.url ?? 'add-link'}
        isOpen={modalOpen}
        initialUrl={pendingCapture?.url}
        initialTitle={pendingCapture?.title}
        autoFetchDefault={autoFetchDefault}
        onSuccess={link => { handleCreate(link); addToast('Link saved'); setModalOpen(false); setPendingCapture(null) }}
        onClose={() => { setModalOpen(false); setPendingCapture(null) }}
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
        onClose={() => setActiveLink(null)}
        onAddToCollection={link => { setActiveLink(null); openCollectionPicker(link, 'menu') }}
      />

      <CollectionPickerSheet
        link={pickerLink}
        onClose={closeCollectionPicker}
        onMembershipChange={(link, collectionId, isMember, membership) =>
          applyMembershipChange(link.id, collectionId, isMember, membership)}
        returnFocus={pickerReturnTarget}
      />
    </>
  )
}
