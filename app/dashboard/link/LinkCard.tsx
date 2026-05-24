import type { LinkWithTags } from '@/lib/services/links'
import { CONTENT_TYPE_CONFIG, STATUS_CONFIG } from '../config'

interface Props {
  link: LinkWithTags
  onMenuOpen: () => void
  onFavoriteToggle: () => void
}

export default function LinkCard({ link, onMenuOpen, onFavoriteToggle }: Props) {
  const type = CONTENT_TYPE_CONFIG[link.content_type]
  const status = STATUS_CONFIG[link.status]

  return (
    <article className="relative flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${type.badge}`}>
          <span aria-hidden="true">{type.icon}</span>
          {type.label}
        </span>
        <div className="relative z-10 flex items-center gap-1">
          <button
            onClick={onFavoriteToggle}
            aria-label={link.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
              link.is_favorite
                ? 'text-amber-400 hover:text-amber-500'
                : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100'
            }`}
          >
            {link.is_favorite ? '⭐' : '☆'}
          </button>
          <button
            onClick={onMenuOpen}
            aria-label="Link options"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 active:bg-slate-200"
          >
            ···
          </button>
        </div>
      </div>

      <div>
        <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-indigo-500"
          >
            {link.title}
          </a>
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">{link.site_name} ↗</p>
      </div>

      <p className="line-clamp-2 flex-1 text-sm text-slate-500">{link.description}</p>

      <div className="relative z-10 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.badge}`}>
          {status.label}
        </span>
        {link.tags.map(tag => (
          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}
