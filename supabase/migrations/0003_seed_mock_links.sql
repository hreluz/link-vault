-- ============================================================
-- Seed: mock links for the test user
-- Depends on: 0002_seed_test_user.sql
-- User ID: 00000000-0000-0000-0000-000000000001
-- ============================================================

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';

  -- link IDs
  v_l1  uuid := '00000000-0000-0000-0001-000000000001';
  v_l2  uuid := '00000000-0000-0000-0001-000000000002';
  v_l3  uuid := '00000000-0000-0000-0001-000000000003';
  v_l4  uuid := '00000000-0000-0000-0001-000000000004';
  v_l5  uuid := '00000000-0000-0000-0001-000000000005';
  v_l6  uuid := '00000000-0000-0000-0001-000000000006';
  v_l7  uuid := '00000000-0000-0000-0001-000000000007';
  v_l8  uuid := '00000000-0000-0000-0001-000000000008';

  -- tag IDs
  v_t_react     uuid := '00000000-0000-0000-0002-000000000001';
  v_t_frontend  uuid := '00000000-0000-0000-0002-000000000002';
  v_t_nextjs    uuid := '00000000-0000-0000-0002-000000000003';
  v_t_framework uuid := '00000000-0000-0000-0002-000000000004';
  v_t_ts        uuid := '00000000-0000-0000-0002-000000000005';
  v_t_docs      uuid := '00000000-0000-0000-0002-000000000006';
  v_t_rsc       uuid := '00000000-0000-0000-0002-000000000007';
  v_t_design    uuid := '00000000-0000-0000-0002-000000000008';
  v_t_ui        uuid := '00000000-0000-0000-0002-000000000009';
  v_t_css       uuid := '00000000-0000-0000-0002-000000000010';
  v_t_flexbox   uuid := '00000000-0000-0000-0002-000000000011';
  v_t_reference uuid := '00000000-0000-0000-0002-000000000012';
  v_t_tips      uuid := '00000000-0000-0000-0002-000000000013';
  v_t_supabase  uuid := '00000000-0000-0000-0002-000000000014';
  v_t_auth      uuid := '00000000-0000-0000-0002-000000000015';
  v_t_backend   uuid := '00000000-0000-0000-0002-000000000016';
begin

  -- ----------------------------------------------------------
  -- Links
  -- ----------------------------------------------------------
  insert into public.links (id, user_id, url, title, description, site_name, content_type, notes, status, is_favorite, created_at, updated_at) values
    (v_l1, v_user,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'React 19 Deep Dive — New Features Explained',
      'A comprehensive walkthrough of everything new in React 19 including Server Components, Actions, and the new hooks.',
      'youtube.com', 'youtube', null, 'unread', false,
      '2026-05-10T10:00:00Z', '2026-05-10T10:00:00Z'),

    (v_l2, v_user,
      'https://github.com/vercel/next.js',
      'Next.js — The React Framework for the Web',
      'The React Framework for the Web. Used by some of the world''s largest companies, Next.js enables high-quality web applications.',
      'github.com', 'github', 'Track for Next.js 16 updates', 'watching', true,
      '2026-05-09T08:00:00Z', '2026-05-09T08:00:00Z'),

    (v_l3, v_user,
      'https://www.typescriptlang.org/docs/',
      'TypeScript Official Documentation',
      'Official TypeScript documentation covering all language features, the type system, and configuration options.',
      'typescriptlang.org', 'course', null, 'read', false,
      '2026-05-08T12:00:00Z', '2026-05-08T12:00:00Z'),

    (v_l4, v_user,
      'https://x.com/dan_abramov/status/1234567890',
      'Dan Abramov on React Server Components',
      'Thread explaining the mental model behind React Server Components and why they matter for the future of web development.',
      'x.com', 'tweet', null, 'unread', false,
      '2026-05-12T15:30:00Z', '2026-05-12T15:30:00Z'),

    (v_l5, v_user,
      'https://www.instagram.com/p/abc123',
      'UI Design Tips for Developers',
      'Quick visual tips for making your interfaces look polished and professional without a design background.',
      'instagram.com', 'instagram', 'Great color palette tips in here', 'favorite', true,
      '2026-05-07T09:00:00Z', '2026-05-07T09:00:00Z'),

    (v_l6, v_user,
      'https://css-tricks.com/a-complete-guide-to-flexbox/',
      'A Complete Guide to Flexbox',
      'A comprehensive reference for the CSS flexbox layout module, with visual examples for every property and combination.',
      'css-tricks.com', 'article', null, 'read', false,
      '2026-05-06T11:00:00Z', '2026-05-06T11:00:00Z'),

    (v_l7, v_user,
      'https://www.tiktok.com/@codewithreact/video/123456',
      '5 TypeScript Tricks You Probably Don''t Know',
      'Short video covering advanced TypeScript patterns that most developers miss, from conditional types to template literals.',
      'tiktok.com', 'tiktok', null, 'watching', false,
      '2026-05-11T20:00:00Z', '2026-05-11T20:00:00Z'),

    (v_l8, v_user,
      'https://supabase.com/docs/guides/auth',
      'Supabase Auth — SSR Guide',
      'Complete guide to authentication with Supabase in server-side rendered apps, covering cookie management and row-level security.',
      'supabase.com', 'article', 'Check the new SSR section', 'archived', false,
      '2026-05-05T14:00:00Z', '2026-05-05T14:00:00Z');

  -- ----------------------------------------------------------
  -- Tags
  -- ----------------------------------------------------------
  insert into public.tags (id, user_id, name) values
    (v_t_react,     v_user, 'react'),
    (v_t_frontend,  v_user, 'frontend'),
    (v_t_nextjs,    v_user, 'nextjs'),
    (v_t_framework, v_user, 'framework'),
    (v_t_ts,        v_user, 'typescript'),
    (v_t_docs,      v_user, 'docs'),
    (v_t_rsc,       v_user, 'rsc'),
    (v_t_design,    v_user, 'design'),
    (v_t_ui,        v_user, 'ui'),
    (v_t_css,       v_user, 'css'),
    (v_t_flexbox,   v_user, 'flexbox'),
    (v_t_reference, v_user, 'reference'),
    (v_t_tips,      v_user, 'tips'),
    (v_t_supabase,  v_user, 'supabase'),
    (v_t_auth,      v_user, 'auth'),
    (v_t_backend,   v_user, 'backend');

  -- ----------------------------------------------------------
  -- Link ↔ Tag associations
  -- ----------------------------------------------------------
  insert into public.link_tags (link_id, tag_id) values
    -- link 1: react, frontend
    (v_l1, v_t_react),
    (v_l1, v_t_frontend),
    -- link 2: nextjs, react, framework
    (v_l2, v_t_nextjs),
    (v_l2, v_t_react),
    (v_l2, v_t_framework),
    -- link 3: typescript, docs
    (v_l3, v_t_ts),
    (v_l3, v_t_docs),
    -- link 4: react, rsc
    (v_l4, v_t_react),
    (v_l4, v_t_rsc),
    -- link 5: design, ui
    (v_l5, v_t_design),
    (v_l5, v_t_ui),
    -- link 6: css, flexbox, reference
    (v_l6, v_t_css),
    (v_l6, v_t_flexbox),
    (v_l6, v_t_reference),
    -- link 7: typescript, tips
    (v_l7, v_t_ts),
    (v_l7, v_t_tips),
    -- link 8: supabase, auth, backend
    (v_l8, v_t_supabase),
    (v_l8, v_t_auth),
    (v_l8, v_t_backend);

end $$;
