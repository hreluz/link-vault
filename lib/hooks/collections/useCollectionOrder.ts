'use client'

import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import {
  removeLinkFromCollection, restoreMembership, swapCollectionLinkPositions,
} from '@/lib/services/collections'
import { useToast } from '@/components/ToastProvider'
import type { CollectionLinkRow } from './useCollectionLinks'

export type MoveDirection = 'up' | 'down'

function swapRows(rows: CollectionLinkRow[], a: string, b: string): CollectionLinkRow[] {
  const ia = rows.findIndex(row => row.link.id === a)
  const ib = rows.findIndex(row => row.link.id === b)
  if (ia === -1 || ib === -1) return rows
  const next = [...rows]
  ;[next[ia], next[ib]] = [next[ib], next[ia]]
  return next
}

/** Same numbering the swap RPC writes: every row 1..N in its current order. */
function renumber(rows: CollectionLinkRow[]): CollectionLinkRow[] {
  return rows.map((row, index) => row.membership.position === index + 1
    ? row
    : { ...row, membership: { ...row.membership, position: index + 1 } })
}

/**
 * ▲/▼ swap with the nearest visible neighbour (optimistic, one swap at a time,
 * rollback + toast on failure) and ✕ remove with an Undo toast.
 */
export function useCollectionOrder(
  collectionId: string,
  collectionName: string,
  rows: CollectionLinkRow[],
  visibleRows: CollectionLinkRow[],
  setRows: Dispatch<SetStateAction<CollectionLinkRow[]>>,
) {
  const { addToast } = useToast()
  const [isSwapping, setIsSwapping] = useState(false)
  // isSwapping only disables the buttons after a re-render; the ref ignores a second tap before that.
  const swappingRef = useRef(false)

  /**
   * Moves the link one visible place. Returns its new visible index (0-based) right
   * away plus a promise of whether the save worked, or null when it can't move or a
   * swap is already saving.
   */
  function move(linkId: string, direction: MoveDirection): { index: number; saved: Promise<boolean> } | null {
    if (swappingRef.current) return null
    const index = visibleRows.findIndex(row => row.link.id === linkId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || targetIndex < 0 || targetIndex >= visibleRows.length) return null
    const neighbourId = visibleRows[targetIndex].link.id

    swappingRef.current = true
    setIsSwapping(true)
    setRows(prev => swapRows(prev, linkId, neighbourId))

    const saved = swapCollectionLinkPositions(collectionId, linkId, neighbourId).then(ok => {
      if (ok) {
        setRows(prev => renumber(prev))
      } else {
        setRows(prev => swapRows(prev, linkId, neighbourId))
        addToast('Failed to reorder', 'destructive')
      }
      swappingRef.current = false
      setIsSwapping(false)
      return ok
    })
    return { index: targetIndex, saved }
  }

  /** Deletes the membership only. The row leaves right away; Undo puts it back in its place. */
  async function remove(linkId: string): Promise<void> {
    const index = rows.findIndex(row => row.link.id === linkId)
    if (index === -1) return
    const removed = { row: rows[index], index }
    setRows(prev => prev.filter(row => row.link.id !== linkId))

    const putBack = () => setRows(prev => {
      if (prev.some(row => row.link.id === linkId)) return prev
      const at = Math.min(removed.index, prev.length)
      return [...prev.slice(0, at), removed.row, ...prev.slice(at)]
    })

    const ok = await removeLinkFromCollection(collectionId, linkId)
    if (!ok) {
      putBack()
      addToast('Failed to remove link', 'destructive')
      return
    }
    toast(`Removed from ${collectionName}`, {
      action: {
        label: 'Undo',
        onClick: async () => {
          if (await restoreMembership(removed.row.membership)) putBack()
          else addToast('Failed to undo', 'destructive')
        },
      },
    })
  }

  return { isSwapping, move, remove }
}
