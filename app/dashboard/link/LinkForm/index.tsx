'use client'

import { useState } from 'react'
import { useLinkFormContext } from '../LinkFormContext'
import CategoryStatusRow from './CategoryStatusRow'
import DescriptionField from './DescriptionField'
import ExpandToggle from './ExpandToggle'
import FormFooter from './FormFooter'
import NotesField from './NotesField'
import TagsField from './TagsField'
import TitleField from './TitleField'
import UrlField from './UrlField'

interface Props {
  scrollable?: boolean
  collapsible?: boolean
}

export default function LinkForm({ scrollable = false, collapsible = false }: Props) {
  const [expanded, setExpanded] = useState(!collapsible)
  const { error, imageUrl } = useLinkFormContext()

  const fieldsCls = scrollable
    ? 'max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4'
    : 'space-y-4'

  const footerCls = scrollable
    ? 'flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800'
    : 'mt-6 flex gap-3'

  return (
    <>
      <div className={fieldsCls}>
        <UrlField />

        {imageUrl && (
          <div className="overflow-hidden rounded-xl">
            <img
              src={imageUrl}
              alt=""
              className="w-full object-cover"
              style={{ aspectRatio: '16/9' }}
              loading="lazy"
            />
          </div>
        )}

        {expanded && (
          <>
            <TitleField />
            <DescriptionField />
            <CategoryStatusRow />
            <TagsField />
            <NotesField />
          </>
        )}

        {collapsible && (
          <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}
      </div>

      <FormFooter className={footerCls} />
    </>
  )
}
