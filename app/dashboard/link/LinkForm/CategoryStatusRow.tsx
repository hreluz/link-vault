'use client'

import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '../../config'
import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function CategoryStatusRow() {
  const { categoryId, setCategoryId, status, setStatus, categories } = useLinkFormContext()

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={LABEL}>Category</label>
        <select
          className={INPUT}
          value={categoryId ?? ''}
          onChange={e => setCategoryId(e.target.value || null)}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.emoticon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>Status</label>
        <select
          className={INPUT}
          value={status}
          onChange={e => setStatus(e.target.value as LinkStatus)}
        >
          {(Object.keys(STATUS_CONFIG) as LinkStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
