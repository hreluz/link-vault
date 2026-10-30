'use client'

import TagChipsInput from '@/components/TagChipsInput'
import { useLinkFormContext } from '../LinkFormContext'

export default function TagsField() {
  const { mode, tags, setTags } = useLinkFormContext()
  // Editing is mostly re-tagging, so Edit lands here on every device (touch included).
  return <TagChipsInput label="Tags" value={tags} onChange={setTags} autoFocusInDialog={mode === 'edit'} />
}
