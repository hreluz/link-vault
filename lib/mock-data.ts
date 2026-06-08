import type { ContentType, LinkStatus } from './types/database'

export interface MockLink {
  id: string
  user_id: string
  url: string
  title: string | null
  description: string | null
  image_url: string | null
  site_name: string | null
  content_type: ContentType
  category_id: string | null
  status: LinkStatus
  is_favorite: boolean
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

const BASE = { user_id: 'mock-user', image_url: null, category_id: null, updated_at: '2026-05-24T00:00:00Z' }

export const MOCK_LINKS: MockLink[] = [
  {
    ...BASE, id: '1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'React 19 Deep Dive — New Features Explained',
    description: 'A comprehensive walkthrough of everything new in React 19 including Server Components, Actions, and the new hooks.',
    site_name: 'youtube.com',
    content_type: 'youtube',
    status: 'unread',
    is_favorite: false,
    tags: ['react', 'frontend'],
    notes: null,
    created_at: '2026-05-10T10:00:00Z',
  },
  {
    ...BASE, id: '2',
    url: 'https://github.com/vercel/next.js',
    title: 'Next.js — The React Framework for the Web',
    description: "The React Framework for the Web. Used by some of the world's largest companies, Next.js enables high-quality web applications.",
    site_name: 'github.com',
    content_type: 'github',
    status: 'watching',
    is_favorite: true,
    tags: ['nextjs', 'react', 'framework'],
    notes: 'Track for Next.js 16 updates',
    created_at: '2026-05-09T08:00:00Z',
  },
  {
    ...BASE, id: '3',
    url: 'https://www.typescriptlang.org/docs/',
    title: 'TypeScript Official Documentation',
    description: 'Official TypeScript documentation covering all language features, the type system, and configuration options.',
    site_name: 'typescriptlang.org',
    content_type: 'course',
    status: 'read',
    is_favorite: false,
    tags: ['typescript', 'docs'],
    notes: null,
    created_at: '2026-05-08T12:00:00Z',
  },
  {
    ...BASE, id: '4',
    url: 'https://x.com/dan_abramov/status/1234567890',
    title: 'Dan Abramov on React Server Components',
    description: 'Thread explaining the mental model behind React Server Components and why they matter for the future of web development.',
    site_name: 'x.com',
    content_type: 'tweet',
    status: 'unread',
    is_favorite: false,
    tags: ['react', 'rsc'],
    notes: null,
    created_at: '2026-05-12T15:30:00Z',
  },
  {
    ...BASE, id: '5',
    url: 'https://www.instagram.com/p/abc123',
    title: 'UI Design Tips for Developers',
    description: 'Quick visual tips for making your interfaces look polished and professional without a design background.',
    site_name: 'instagram.com',
    content_type: 'instagram',
    status: 'favorite',
    is_favorite: true,
    tags: ['design', 'ui'],
    notes: 'Great color palette tips in here',
    created_at: '2026-05-07T09:00:00Z',
  },
  {
    ...BASE, id: '6',
    url: 'https://css-tricks.com/a-complete-guide-to-flexbox/',
    title: 'A Complete Guide to Flexbox',
    description: 'A comprehensive reference for the CSS flexbox layout module, with visual examples for every property and combination.',
    site_name: 'css-tricks.com',
    content_type: 'article',
    status: 'read',
    is_favorite: false,
    tags: ['css', 'flexbox', 'reference'],
    notes: null,
    created_at: '2026-05-06T11:00:00Z',
  },
  {
    ...BASE, id: '7',
    url: 'https://www.tiktok.com/@codewithreact/video/123456',
    title: '5 TypeScript Tricks You Probably Don\'t Know',
    description: 'Short video covering advanced TypeScript patterns that most developers miss, from conditional types to template literals.',
    site_name: 'tiktok.com',
    content_type: 'tiktok',
    status: 'watching',
    is_favorite: false,
    tags: ['typescript', 'tips'],
    notes: null,
    created_at: '2026-05-11T20:00:00Z',
  },
  {
    ...BASE, id: '8',
    url: 'https://supabase.com/docs/guides/auth',
    title: 'Supabase Auth — SSR Guide',
    description: 'Complete guide to authentication with Supabase in server-side rendered apps, covering cookie management and row-level security.',
    site_name: 'supabase.com',
    content_type: 'article',
    status: 'archived',
    is_favorite: false,
    tags: ['supabase', 'auth', 'backend'],
    notes: 'Check the new SSR section',
    created_at: '2026-05-05T14:00:00Z',
  },
]
