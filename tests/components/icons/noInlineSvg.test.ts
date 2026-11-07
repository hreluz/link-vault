import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// SPEC 38: SVG markup lives only in components/icons/. Everything else renders
// a named icon component imported from '@/components/icons'.
const ROOT = join(__dirname, '..', '..', '..')
const SCANNED_DIRS = ['app', 'components']
const ICONS_DIR = join(ROOT, 'components', 'icons')

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return path === ICONS_DIR ? [] : tsxFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

describe('inline SVG guard', () => {
  it('finds no <svg> outside components/icons/', () => {
    const offenders = SCANNED_DIRS
      .flatMap(dir => tsxFiles(join(ROOT, dir)))
      .filter(file => readFileSync(file, 'utf8').includes('<svg'))
      .map(file => relative(ROOT, file).split(sep).join('/'))

    expect(offenders).toEqual([])
  })

  it('keeps <svg> inside components/icons/ to the Icon base', () => {
    const offenders = readdirSync(ICONS_DIR)
      .filter(name => name.endsWith('.tsx') && name !== 'Icon.tsx')
      .filter(name => readFileSync(join(ICONS_DIR, name), 'utf8').includes('<svg'))

    expect(offenders).toEqual([])
  })
})
