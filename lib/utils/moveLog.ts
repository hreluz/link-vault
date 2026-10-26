export const MOVE_LOG_FLAG = 'linkvault:debug-move'

type MoveLogMode = 'off' | 'ids' | 'titles'

/**
 * Opt-in debug logs for the move-to-end timers, set via
 * `localStorage['linkvault:debug-move']`: `'1'` logs link ids only,
 * `'titles'` also adds each link's title (decrypted content -- only for
 * debugging your own vault). Anything else is off, so other users' consoles
 * stay clean. Read on every call, so toggling needs no reload.
 */
function moveLogMode(): MoveLogMode {
  try {
    if (typeof localStorage === 'undefined') return 'off'
    const value = localStorage.getItem(MOVE_LOG_FLAG)
    return value === '1' ? 'ids' : value === 'titles' ? 'titles' : 'off'
  } catch {
    return 'off'
  }
}

export function isMoveLogEnabled(): boolean {
  return moveLogMode() !== 'off'
}

// id → title, filled on open only in 'titles' mode, so later events for the
// same link (fired, cancelled, ...) can name it without a list lookup.
const titlesById = new Map<string, string>()

export function rememberMoveTitle(link: { id: string; title: string | null; url: string } | undefined) {
  if (!link || moveLogMode() !== 'titles') return
  titlesById.set(link.id, link.title || link.url)
}

export function logMove(event: string, data: Record<string, unknown> = {}) {
  const mode = moveLogMode()
  if (mode === 'off') return
  const at = new Date().toISOString().slice(11, 23)
  const extra: Record<string, unknown> = {}
  if (mode === 'titles') {
    if (typeof data.id === 'string') extra.title = titlesById.get(data.id) ?? null
    if (Array.isArray(data.ids)) extra.titles = data.ids.map(id => titlesById.get(id) ?? null)
  }
  // Titles go first: collapsed console previews only show ~5 properties.
  console.info('[move-to-end]', event, { at, ...extra, ...data })
}
