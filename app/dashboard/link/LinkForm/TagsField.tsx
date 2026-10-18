'use client'

import TagChipsInput from '@/components/TagChipsInput'
import { useLinkFormContext } from '../LinkFormContext'

export default function TagsField() {
  const { tags, setTags } = useLinkFormContext()
  return <TagChipsInput label="Tags" value={tags} onChange={setTags} />
}
