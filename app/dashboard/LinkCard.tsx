import type { MockLink } from '@/lib/mock-data'
import { CONTENT_TYPE_CONFIG, STATUS_CONFIG } from './config'

export default function LinkCard({ link }: { link: MockLink }) {
  const type = CONTENT_TYPE_CONFIG[link.content_type]
  const status = STATUS_CONFIG[link.status]

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${type.badge}`}>
          <span aria-hidden="true">{type.icon}</span>
          {type.label}
        </span>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}>
          {status.label}
        </span>
      </div>

      <div>
        <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900">{link.title}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{link.site_name}</p>
      </div>

      <p className="line-clamp-2 flex-1 text-sm text-slate-500">{link.description}</p>

      {link.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {link.tags.map(tag => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
