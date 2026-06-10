-- ============================================================
-- Seed: 100 mock links for the test user
-- Depends on: 0002_seed_test_user.sql
-- User ID: 00000000-0000-0000-0000-000000000001
-- ============================================================

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';

  -- link IDs
  v_l001 uuid := '00000000-0000-0000-0001-000000000001';
  v_l002 uuid := '00000000-0000-0000-0001-000000000002';
  v_l003 uuid := '00000000-0000-0000-0001-000000000003';
  v_l004 uuid := '00000000-0000-0000-0001-000000000004';
  v_l005 uuid := '00000000-0000-0000-0001-000000000005';
  v_l006 uuid := '00000000-0000-0000-0001-000000000006';
  v_l007 uuid := '00000000-0000-0000-0001-000000000007';
  v_l008 uuid := '00000000-0000-0000-0001-000000000008';
  v_l009 uuid := '00000000-0000-0000-0001-000000000009';
  v_l010 uuid := '00000000-0000-0000-0001-000000000010';
  v_l011 uuid := '00000000-0000-0000-0001-000000000011';
  v_l012 uuid := '00000000-0000-0000-0001-000000000012';
  v_l013 uuid := '00000000-0000-0000-0001-000000000013';
  v_l014 uuid := '00000000-0000-0000-0001-000000000014';
  v_l015 uuid := '00000000-0000-0000-0001-000000000015';
  v_l016 uuid := '00000000-0000-0000-0001-000000000016';
  v_l017 uuid := '00000000-0000-0000-0001-000000000017';
  v_l018 uuid := '00000000-0000-0000-0001-000000000018';
  v_l019 uuid := '00000000-0000-0000-0001-000000000019';
  v_l020 uuid := '00000000-0000-0000-0001-000000000020';
  v_l021 uuid := '00000000-0000-0000-0001-000000000021';
  v_l022 uuid := '00000000-0000-0000-0001-000000000022';
  v_l023 uuid := '00000000-0000-0000-0001-000000000023';
  v_l024 uuid := '00000000-0000-0000-0001-000000000024';
  v_l025 uuid := '00000000-0000-0000-0001-000000000025';
  v_l026 uuid := '00000000-0000-0000-0001-000000000026';
  v_l027 uuid := '00000000-0000-0000-0001-000000000027';
  v_l028 uuid := '00000000-0000-0000-0001-000000000028';
  v_l029 uuid := '00000000-0000-0000-0001-000000000029';
  v_l030 uuid := '00000000-0000-0000-0001-000000000030';
  v_l031 uuid := '00000000-0000-0000-0001-000000000031';
  v_l032 uuid := '00000000-0000-0000-0001-000000000032';
  v_l033 uuid := '00000000-0000-0000-0001-000000000033';
  v_l034 uuid := '00000000-0000-0000-0001-000000000034';
  v_l035 uuid := '00000000-0000-0000-0001-000000000035';
  v_l036 uuid := '00000000-0000-0000-0001-000000000036';
  v_l037 uuid := '00000000-0000-0000-0001-000000000037';
  v_l038 uuid := '00000000-0000-0000-0001-000000000038';
  v_l039 uuid := '00000000-0000-0000-0001-000000000039';
  v_l040 uuid := '00000000-0000-0000-0001-000000000040';
  v_l041 uuid := '00000000-0000-0000-0001-000000000041';
  v_l042 uuid := '00000000-0000-0000-0001-000000000042';
  v_l043 uuid := '00000000-0000-0000-0001-000000000043';
  v_l044 uuid := '00000000-0000-0000-0001-000000000044';
  v_l045 uuid := '00000000-0000-0000-0001-000000000045';
  v_l046 uuid := '00000000-0000-0000-0001-000000000046';
  v_l047 uuid := '00000000-0000-0000-0001-000000000047';
  v_l048 uuid := '00000000-0000-0000-0001-000000000048';
  v_l049 uuid := '00000000-0000-0000-0001-000000000049';
  v_l050 uuid := '00000000-0000-0000-0001-000000000050';
  v_l051 uuid := '00000000-0000-0000-0001-000000000051';
  v_l052 uuid := '00000000-0000-0000-0001-000000000052';
  v_l053 uuid := '00000000-0000-0000-0001-000000000053';
  v_l054 uuid := '00000000-0000-0000-0001-000000000054';
  v_l055 uuid := '00000000-0000-0000-0001-000000000055';
  v_l056 uuid := '00000000-0000-0000-0001-000000000056';
  v_l057 uuid := '00000000-0000-0000-0001-000000000057';
  v_l058 uuid := '00000000-0000-0000-0001-000000000058';
  v_l059 uuid := '00000000-0000-0000-0001-000000000059';
  v_l060 uuid := '00000000-0000-0000-0001-000000000060';
  v_l061 uuid := '00000000-0000-0000-0001-000000000061';
  v_l062 uuid := '00000000-0000-0000-0001-000000000062';
  v_l063 uuid := '00000000-0000-0000-0001-000000000063';
  v_l064 uuid := '00000000-0000-0000-0001-000000000064';
  v_l065 uuid := '00000000-0000-0000-0001-000000000065';
  v_l066 uuid := '00000000-0000-0000-0001-000000000066';
  v_l067 uuid := '00000000-0000-0000-0001-000000000067';
  v_l068 uuid := '00000000-0000-0000-0001-000000000068';
  v_l069 uuid := '00000000-0000-0000-0001-000000000069';
  v_l070 uuid := '00000000-0000-0000-0001-000000000070';
  v_l071 uuid := '00000000-0000-0000-0001-000000000071';
  v_l072 uuid := '00000000-0000-0000-0001-000000000072';
  v_l073 uuid := '00000000-0000-0000-0001-000000000073';
  v_l074 uuid := '00000000-0000-0000-0001-000000000074';
  v_l075 uuid := '00000000-0000-0000-0001-000000000075';
  v_l076 uuid := '00000000-0000-0000-0001-000000000076';
  v_l077 uuid := '00000000-0000-0000-0001-000000000077';
  v_l078 uuid := '00000000-0000-0000-0001-000000000078';
  v_l079 uuid := '00000000-0000-0000-0001-000000000079';
  v_l080 uuid := '00000000-0000-0000-0001-000000000080';
  v_l081 uuid := '00000000-0000-0000-0001-000000000081';
  v_l082 uuid := '00000000-0000-0000-0001-000000000082';
  v_l083 uuid := '00000000-0000-0000-0001-000000000083';
  v_l084 uuid := '00000000-0000-0000-0001-000000000084';
  v_l085 uuid := '00000000-0000-0000-0001-000000000085';
  v_l086 uuid := '00000000-0000-0000-0001-000000000086';
  v_l087 uuid := '00000000-0000-0000-0001-000000000087';
  v_l088 uuid := '00000000-0000-0000-0001-000000000088';
  v_l089 uuid := '00000000-0000-0000-0001-000000000089';
  v_l090 uuid := '00000000-0000-0000-0001-000000000090';
  v_l091 uuid := '00000000-0000-0000-0001-000000000091';
  v_l092 uuid := '00000000-0000-0000-0001-000000000092';
  v_l093 uuid := '00000000-0000-0000-0001-000000000093';
  v_l094 uuid := '00000000-0000-0000-0001-000000000094';
  v_l095 uuid := '00000000-0000-0000-0001-000000000095';
  v_l096 uuid := '00000000-0000-0000-0001-000000000096';
  v_l097 uuid := '00000000-0000-0000-0001-000000000097';
  v_l098 uuid := '00000000-0000-0000-0001-000000000098';
  v_l099 uuid := '00000000-0000-0000-0001-000000000099';
  v_l100 uuid := '00000000-0000-0000-0001-000000000100';

  -- category IDs
  v_c_not_defined uuid := '00000000-0000-0000-0004-000000000000';
  v_c_youtube     uuid := '00000000-0000-0000-0004-000000000001';
  v_c_instagram   uuid := '00000000-0000-0000-0004-000000000002';
  v_c_tiktok      uuid := '00000000-0000-0000-0004-000000000003';
  v_c_article     uuid := '00000000-0000-0000-0004-000000000004';
  v_c_course      uuid := '00000000-0000-0000-0004-000000000005';
  v_c_tweet       uuid := '00000000-0000-0000-0004-000000000006';
  v_c_github      uuid := '00000000-0000-0000-0004-000000000007';
  v_c_other       uuid := '00000000-0000-0000-0004-000000000008';

  -- tag IDs — existing
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
  -- tag IDs — new
  v_t_ai         uuid := '00000000-0000-0000-0002-000000000017';
  v_t_rust       uuid := '00000000-0000-0000-0002-000000000018';
  v_t_devops     uuid := '00000000-0000-0000-0002-000000000019';
  v_t_docker     uuid := '00000000-0000-0000-0002-000000000020';
  v_t_kubernetes uuid := '00000000-0000-0000-0002-000000000021';
  v_t_testing    uuid := '00000000-0000-0000-0002-000000000022';
  v_t_perf       uuid := '00000000-0000-0000-0002-000000000023';
  v_t_a11y       uuid := '00000000-0000-0000-0002-000000000024';
  v_t_animation  uuid := '00000000-0000-0000-0002-000000000025';
  v_t_tailwind   uuid := '00000000-0000-0000-0002-000000000026';
  v_t_nodejs     uuid := '00000000-0000-0000-0002-000000000027';
  v_t_database   uuid := '00000000-0000-0000-0002-000000000028';
  v_t_graphql    uuid := '00000000-0000-0000-0002-000000000029';
  v_t_api        uuid := '00000000-0000-0000-0002-000000000030';
  v_t_security   uuid := '00000000-0000-0000-0002-000000000031';
  v_t_arch       uuid := '00000000-0000-0000-0002-000000000032';
  v_t_career     uuid := '00000000-0000-0000-0002-000000000033';
  v_t_prod       uuid := '00000000-0000-0000-0002-000000000034';
  v_t_git        uuid := '00000000-0000-0000-0002-000000000035';
  v_t_js         uuid := '00000000-0000-0000-0002-000000000036';
  v_t_algorithms uuid := '00000000-0000-0000-0002-000000000037';
  v_t_interviews uuid := '00000000-0000-0000-0002-000000000038';
  v_t_svelte     uuid := '00000000-0000-0000-0002-000000000039';
  v_t_mobile     uuid := '00000000-0000-0000-0002-000000000040';
  v_t_oss        uuid := '00000000-0000-0000-0002-000000000041';
  v_t_tools      uuid := '00000000-0000-0000-0002-000000000042';
  v_t_postgres   uuid := '00000000-0000-0000-0002-000000000043';

begin

  -- ----------------------------------------------------------
  -- Categories
  -- ----------------------------------------------------------
  insert into public.categories (id, user_id, name, emoticon, color, description) values
    (v_c_not_defined, v_user, 'Not defined', '🔖', '#94A3B8', 'Uncategorized links'),
    (v_c_youtube,     v_user, 'YouTube',     '📺', '#FF0000', 'Videos and tutorials'),
    (v_c_instagram,   v_user, 'Instagram',   '📸', '#E1306C', 'Photos, reels and stories'),
    (v_c_tiktok,      v_user, 'TikTok',      '🎵', '#69C9D0', 'Short-form videos'),
    (v_c_article,     v_user, 'Article',     '📄', '#3B82F6', 'Blog posts and articles'),
    (v_c_course,      v_user, 'Course',      '🎓', '#8B5CF6', 'Courses and documentation'),
    (v_c_tweet,       v_user, 'Tweet',       '🐦', '#1D9BF0', 'Posts from X / Twitter'),
    (v_c_github,      v_user, 'GitHub',      '💻', '#24292E', 'Repositories and code'),
    (v_c_other,       v_user, 'Other',       '🔗', '#6B7280', 'Everything else');

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
    (v_t_backend,   v_user, 'backend'),
    (v_t_ai,        v_user, 'ai'),
    (v_t_rust,      v_user, 'rust'),
    (v_t_devops,    v_user, 'devops'),
    (v_t_docker,    v_user, 'docker'),
    (v_t_kubernetes,v_user, 'kubernetes'),
    (v_t_testing,   v_user, 'testing'),
    (v_t_perf,      v_user, 'performance'),
    (v_t_a11y,      v_user, 'accessibility'),
    (v_t_animation, v_user, 'animation'),
    (v_t_tailwind,  v_user, 'tailwind'),
    (v_t_nodejs,    v_user, 'nodejs'),
    (v_t_database,  v_user, 'database'),
    (v_t_graphql,   v_user, 'graphql'),
    (v_t_api,       v_user, 'api'),
    (v_t_security,  v_user, 'security'),
    (v_t_arch,      v_user, 'architecture'),
    (v_t_career,    v_user, 'career'),
    (v_t_prod,      v_user, 'productivity'),
    (v_t_git,       v_user, 'git'),
    (v_t_js,        v_user, 'javascript'),
    (v_t_algorithms,v_user, 'algorithms'),
    (v_t_interviews,v_user, 'interviews'),
    (v_t_svelte,    v_user, 'svelte'),
    (v_t_mobile,    v_user, 'mobile'),
    (v_t_oss,       v_user, 'open-source'),
    (v_t_tools,     v_user, 'tools'),
    (v_t_postgres,  v_user, 'postgres');

  -- ----------------------------------------------------------
  -- Links (100 total)
  -- ----------------------------------------------------------
  insert into public.links (id, user_id, url, title, description, site_name, category_id, notes, status, is_favorite, created_at, updated_at) values

  -- ── YouTube (28 links) ──────────────────────────────────
  (v_l001, v_user,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'React 19 Deep Dive — New Features Explained',
    'A comprehensive walkthrough of everything new in React 19 including Server Components, Actions, and the new hooks.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-05-10T10:00:00Z', '2026-05-10T10:00:00Z'),

  (v_l002, v_user,
    'https://www.youtube.com/watch?v=aB2cD3eF4gH',
    'Next.js App Router — Complete Course 2026',
    'Four-hour deep dive into the Next.js App Router: layouts, loading states, error boundaries, server actions, and deployment.',
    'youtube.com', v_c_youtube, 'Bookmark 1:22:00 for the caching section', 'watching', true,
    '2026-05-15T09:00:00Z', '2026-05-15T09:00:00Z'),

  (v_l003, v_user,
    'https://www.youtube.com/watch?v=iJ5kL6mN7oP',
    'Tailwind CSS v4 — What Changed and Why It Matters',
    'Overview of the new engine, faster JIT, CSS-first config, and the migration path from v3.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-04-20T14:00:00Z', '2026-04-20T14:00:00Z'),

  (v_l004, v_user,
    'https://www.youtube.com/watch?v=qR8sT9uV0wX',
    'Supabase Crash Course — Auth, DB, Storage in 90 Minutes',
    'Build a full-stack app from scratch using Supabase for auth, PostgreSQL for data, and Storage for files.',
    'youtube.com', v_c_youtube, 'Great for showing the team', 'watching', false,
    '2026-03-12T11:00:00Z', '2026-03-12T11:00:00Z'),

  (v_l005, v_user,
    'https://www.youtube.com/watch?v=yZ0aB1cD2eF',
    'Building AI Apps with the Vercel AI SDK',
    'Stream LLM responses, handle tool calls, and persist chat history using the Vercel AI SDK with Next.js.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-05-02T16:00:00Z', '2026-05-02T16:00:00Z'),

  (v_l006, v_user,
    'https://www.youtube.com/watch?v=gH3iJ4kL5mN',
    'Rust for JavaScript Developers',
    'Side-by-side comparison of Rust and JS concepts: ownership vs. garbage collection, traits vs. interfaces, and cargo vs. npm.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-02-28T10:30:00Z', '2026-02-28T10:30:00Z'),

  (v_l007, v_user,
    'https://www.youtube.com/watch?v=oP6qR7sT8uV',
    'System Design Interview Patterns — Top 10',
    'Covers rate limiting, URL shortening, distributed caching, message queues, and more with diagrams.',
    'youtube.com', v_c_youtube, 'Must review before interviews', 'watching', true,
    '2026-01-15T08:00:00Z', '2026-01-15T08:00:00Z'),

  (v_l008, v_user,
    'https://www.youtube.com/watch?v=wX0yZ1aB2cD',
    'CSS Animations Masterclass — From Basics to GSAP',
    'Transitions, keyframes, scroll-driven animations, and how to orchestrate complex sequences with GSAP.',
    'youtube.com', v_c_youtube, null, 'read', false,
    '2025-12-05T15:00:00Z', '2025-12-05T15:00:00Z'),

  (v_l009, v_user,
    'https://www.youtube.com/watch?v=eF3gH4iJ5kL',
    'Docker for Developers — Full Course',
    'Containers, images, volumes, Docker Compose, and how to containerize a Next.js + Postgres stack.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-04-01T10:00:00Z', '2026-04-01T10:00:00Z'),

  (v_l010, v_user,
    'https://www.youtube.com/watch?v=mN6oP7qR8sT',
    'How Git Works Internally',
    'Explore the .git directory, DAGs, pack files, and refs. Understanding Git internals makes conflicts trivial.',
    'youtube.com', v_c_youtube, null, 'read', true,
    '2025-11-20T12:00:00Z', '2025-11-20T12:00:00Z'),

  (v_l011, v_user,
    'https://www.youtube.com/watch?v=uV9wX0yZ1aB',
    'GraphQL vs REST — When to Use Each',
    'Honest comparison of DX, performance, caching, and real-world trade-offs with live code examples.',
    'youtube.com', v_c_youtube, null, 'read', false,
    '2025-10-08T13:00:00Z', '2025-10-08T13:00:00Z'),

  (v_l012, v_user,
    'https://www.youtube.com/watch?v=cD2eF3gH4iJ',
    'PostgreSQL Performance Tuning — Indexes, EXPLAIN, and Vacuuming',
    'How to find slow queries, choose the right index type, and keep autovacuum healthy in production.',
    'youtube.com', v_c_youtube, 'Covers the partial index trick we need', 'watching', false,
    '2026-03-25T09:30:00Z', '2026-03-25T09:30:00Z'),

  (v_l013, v_user,
    'https://www.youtube.com/watch?v=kL5mN6oP7qR',
    'Building a Design System from Scratch',
    'Tokens, component API design, Storybook setup, and publishing to npm — the full workflow explained.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-05-08T11:00:00Z', '2026-05-08T11:00:00Z'),

  (v_l014, v_user,
    'https://www.youtube.com/watch?v=sT8uV9wX0yZ',
    'The Future of AI in Software Development',
    'Panel discussion on AI pair programmers, autonomous agents, and where human engineers will focus in 5 years.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-05-20T17:00:00Z', '2026-05-20T17:00:00Z'),

  (v_l015, v_user,
    'https://www.youtube.com/watch?v=aB1cD2eF3gH',
    'SvelteKit vs Next.js — Honest Comparison in 2026',
    'DX, performance, routing, SSR, and ecosystem maturity compared through building the same app twice.',
    'youtube.com', v_c_youtube, null, 'watching', false,
    '2026-04-10T10:00:00Z', '2026-04-10T10:00:00Z'),

  (v_l016, v_user,
    'https://www.youtube.com/watch?v=iJ4kL5mN6oP',
    'Web Accessibility from Zero — Screen Readers, ARIA, and Testing',
    'Practical accessibility: semantic HTML, ARIA roles, keyboard traps, and using axe-core in CI.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-02-14T14:00:00Z', '2026-02-14T14:00:00Z'),

  (v_l017, v_user,
    'https://www.youtube.com/watch?v=qR7sT8uV9wX',
    'Kubernetes for Developers — Not Just for Ops',
    'Pods, deployments, services, ingress, and how to run local k8s with minikube as a dev environment.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-01-30T09:00:00Z', '2026-01-30T09:00:00Z'),

  (v_l018, v_user,
    'https://www.youtube.com/watch?v=yZ0aB1cD3eF',
    'Vim Motions in VS Code — Productivity Unlocked',
    'Practical Vim motions you can learn in a weekend that will permanently speed up your editing.',
    'youtube.com', v_c_youtube, null, 'read', true,
    '2025-09-15T11:00:00Z', '2025-09-15T11:00:00Z'),

  (v_l019, v_user,
    'https://www.youtube.com/watch?v=gH4iJ5kL6mN',
    'Live Senior Dev Interview — Real Coding Session',
    'Unedited recording of a senior frontend interview: system design, take-home review, and live coding.',
    'youtube.com', v_c_youtube, 'Watch before interviews', 'watching', true,
    '2026-04-28T15:00:00Z', '2026-04-28T15:00:00Z'),

  (v_l020, v_user,
    'https://www.youtube.com/watch?v=oP6qR7sT9uV',
    'Advanced TypeScript Patterns You Actually Use',
    'Conditional types, mapped types, template literals, and infer — with real-world use cases not toy examples.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-05-05T10:00:00Z', '2026-05-05T10:00:00Z'),

  (v_l021, v_user,
    'https://www.youtube.com/watch?v=wX1yZ2aB3cD',
    'Bun vs Node.js — Real Benchmarks in 2026',
    'Startup time, HTTP throughput, file I/O, and SQLite benchmarks comparing Bun 1.2 and Node 22.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-05-18T08:00:00Z', '2026-05-18T08:00:00Z'),

  (v_l022, v_user,
    'https://www.youtube.com/watch?v=eF3gH5iJ6kL',
    'React Testing Library — The Right Mental Model',
    'Why RTL tests behavior and not implementation, and how to write tests that survive refactors.',
    'youtube.com', v_c_youtube, 'Great for onboarding new devs', 'read', false,
    '2025-08-20T13:00:00Z', '2025-08-20T13:00:00Z'),

  (v_l023, v_user,
    'https://www.youtube.com/watch?v=mN7oP8qR9sT',
    'tRPC End-to-End Type Safety in 30 Minutes',
    'Set up tRPC with Next.js, define routers, call procedures from the client, and handle errors.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-04-05T16:00:00Z', '2026-04-05T16:00:00Z'),

  (v_l024, v_user,
    'https://www.youtube.com/watch?v=uV0wX1yZ2aB',
    'Edge Computing Explained — Vercel, Cloudflare, and Deno Deploy',
    'What edge functions are, when to use them, and the cold start / latency trade-offs.',
    'youtube.com', v_c_youtube, null, 'read', false,
    '2025-11-10T10:00:00Z', '2025-11-10T10:00:00Z'),

  (v_l025, v_user,
    'https://www.youtube.com/watch?v=cD3eF4gH5iJ',
    'CSS Grid Mastery — Every Property Explained',
    'Named template areas, subgrid, auto-placement algorithm, and responsive layouts without media queries.',
    'youtube.com', v_c_youtube, null, 'read', false,
    '2025-10-22T11:00:00Z', '2025-10-22T11:00:00Z'),

  (v_l026, v_user,
    'https://www.youtube.com/watch?v=kL6mN7oP8qR',
    'Drizzle ORM — Better Than Prisma?',
    'Type-safe SQL queries, schema migrations, and how Drizzle compares to Prisma in DX and performance.',
    'youtube.com', v_c_youtube, null, 'watching', false,
    '2026-03-01T14:00:00Z', '2026-03-01T14:00:00Z'),

  (v_l027, v_user,
    'https://www.youtube.com/watch?v=sT9uV0wX1yZ',
    'Building a CLI Tool with TypeScript and Bun',
    'Argument parsing, interactive prompts, file system operations, and publishing to npm.',
    'youtube.com', v_c_youtube, null, 'unread', false,
    '2026-05-22T09:00:00Z', '2026-05-22T09:00:00Z'),

  (v_l028, v_user,
    'https://www.youtube.com/watch?v=aB2cD3eF5gH',
    'Web Performance in 2026 — Core Web Vitals Deep Dive',
    'LCP, CLS, INP explained with real profiling sessions and fixes for common Next.js performance regressions.',
    'youtube.com', v_c_youtube, 'LCP section is gold', 'watching', true,
    '2026-05-25T10:00:00Z', '2026-05-25T10:00:00Z'),

  -- ── GitHub (15 links) ───────────────────────────────────
  (v_l029, v_user,
    'https://github.com/vercel/next.js',
    'Next.js — The React Framework for the Web',
    'The React framework for the Web used by some of the world''s largest companies. Enables high-quality web applications with the power of React.',
    'github.com', v_c_github, 'Track for Next.js 16 updates', 'watching', true,
    '2026-05-09T08:00:00Z', '2026-05-09T08:00:00Z'),

  (v_l030, v_user,
    'https://github.com/shadcn-ui/ui',
    'shadcn/ui — Beautifully Designed Components',
    'Copy-paste components built with Radix UI and Tailwind. Not a library — your code, your rules.',
    'github.com', v_c_github, 'Check out the new sidebar component', 'watching', true,
    '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),

  (v_l031, v_user,
    'https://github.com/tailwindlabs/tailwindcss',
    'Tailwind CSS — A Utility-First CSS Framework',
    'Rapidly build modern websites without ever leaving your HTML. The v4 rewrite is built on a native CSS engine.',
    'github.com', v_c_github, null, 'watching', false,
    '2026-03-20T09:00:00Z', '2026-03-20T09:00:00Z'),

  (v_l032, v_user,
    'https://github.com/supabase/supabase',
    'Supabase — The Open Source Firebase Alternative',
    'Auth, database, storage, realtime, and edge functions. Built on Postgres.',
    'github.com', v_c_github, null, 'watching', true,
    '2026-02-10T11:00:00Z', '2026-02-10T11:00:00Z'),

  (v_l033, v_user,
    'https://github.com/trpc/trpc',
    'tRPC — End-to-End Type Safety Without Schema',
    'Move fast and break nothing. Full-stack TypeScript without code generation or runtime bloat.',
    'github.com', v_c_github, null, 'unread', false,
    '2026-04-02T14:00:00Z', '2026-04-02T14:00:00Z'),

  (v_l034, v_user,
    'https://github.com/colinhacks/zod',
    'Zod — TypeScript-First Schema Validation',
    'Declare a validator once and Zod infers the static TypeScript type. Works beautifully with tRPC and React Hook Form.',
    'github.com', v_c_github, null, 'read', false,
    '2025-12-01T10:00:00Z', '2025-12-01T10:00:00Z'),

  (v_l035, v_user,
    'https://github.com/TanStack/query',
    'TanStack Query — Powerful Async State Management',
    'Fetch, cache, synchronize, and update server state in your web applications. Formerly React Query.',
    'github.com', v_c_github, 'Upgrade notes for v6', 'watching', true,
    '2026-01-20T09:00:00Z', '2026-01-20T09:00:00Z'),

  (v_l036, v_user,
    'https://github.com/drizzle-team/drizzle-orm',
    'Drizzle ORM — Type-Safe SQL for TypeScript',
    'Headless ORM for TypeScript. Write SQL-like queries with full type inference and zero magic.',
    'github.com', v_c_github, null, 'unread', false,
    '2026-03-08T13:00:00Z', '2026-03-08T13:00:00Z'),

  (v_l037, v_user,
    'https://github.com/lucia-auth/lucia',
    'Lucia — Auth for the Modern Web',
    'Framework-agnostic authentication library for TypeScript. Works with any database adapter.',
    'github.com', v_c_github, null, 'unread', false,
    '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),

  (v_l038, v_user,
    'https://github.com/honojs/hono',
    'Hono — Ultrafast Web Framework for the Edges',
    'Small, simple, and ultrafast. Works on Cloudflare Workers, Deno, Bun, AWS Lambda, and Node.js.',
    'github.com', v_c_github, null, 'unread', false,
    '2026-05-01T11:00:00Z', '2026-05-01T11:00:00Z'),

  (v_l039, v_user,
    'https://github.com/oven-sh/bun',
    'Bun — Fast All-in-One JavaScript Runtime',
    'JavaScript runtime, package manager, bundler, and test runner. Drop-in Node.js replacement with native TypeScript.',
    'github.com', v_c_github, null, 'watching', false,
    '2026-03-15T09:00:00Z', '2026-03-15T09:00:00Z'),

  (v_l040, v_user,
    'https://github.com/withastro/astro',
    'Astro — The Web Framework for Content-Driven Websites',
    'Zero JS by default, islands architecture, and works with React, Svelte, Vue, and Solid components.',
    'github.com', v_c_github, null, 'read', false,
    '2025-11-05T14:00:00Z', '2025-11-05T14:00:00Z'),

  (v_l041, v_user,
    'https://github.com/expo/expo',
    'Expo — React Native Platform',
    'Build universal native apps for iOS, Android, and web with a single React codebase.',
    'github.com', v_c_github, null, 'unread', false,
    '2026-02-20T10:00:00Z', '2026-02-20T10:00:00Z'),

  (v_l042, v_user,
    'https://github.com/langchain-ai/langchainjs',
    'LangChain.js — Build LLM Applications',
    'Framework for building AI applications: chains, agents, RAG pipelines, and tool use for JavaScript.',
    'github.com', v_c_github, null, 'unread', false,
    '2026-05-12T15:00:00Z', '2026-05-12T15:00:00Z'),

  (v_l043, v_user,
    'https://github.com/biomejs/biome',
    'Biome — Formatter and Linter for the Web',
    'A fast formatter and linter for JavaScript, TypeScript, JSON, and CSS. Drop-in Prettier + ESLint replacement.',
    'github.com', v_c_github, 'Try replacing ESLint in this project', 'unread', false,
    '2026-04-25T09:00:00Z', '2026-04-25T09:00:00Z'),

  -- ── Articles (20 links) ─────────────────────────────────
  (v_l044, v_user,
    'https://javascript.info/closure',
    'JavaScript Closures — The Complete Picture',
    'Lexical environment, closure scope, and practical patterns like module factories and memoization.',
    'javascript.info', v_c_article, null, 'read', false,
    '2025-09-10T11:00:00Z', '2025-09-10T11:00:00Z'),

  (v_l045, v_user,
    'https://css-tricks.com/a-complete-guide-to-flexbox/',
    'A Complete Guide to Flexbox',
    'A comprehensive reference for the CSS flexbox layout module, with visual examples for every property and combination.',
    'css-tricks.com', v_c_article, null, 'read', false,
    '2026-05-06T11:00:00Z', '2026-05-06T11:00:00Z'),

  (v_l046, v_user,
    'https://www.typescriptlang.org/docs/',
    'TypeScript Official Documentation',
    'Official TypeScript documentation covering all language features, the type system, and configuration options.',
    'typescriptlang.org', v_c_course, null, 'read', false,
    '2026-05-08T12:00:00Z', '2026-05-08T12:00:00Z'),

  (v_l047, v_user,
    'https://supabase.com/docs/guides/auth/server-side/nextjs',
    'Supabase Auth — SSR Guide for Next.js',
    'Complete guide to authentication with Supabase in server-side rendered apps, covering cookie management and RLS.',
    'supabase.com', v_c_article, 'Check the new SSR section', 'archived', false,
    '2026-05-05T14:00:00Z', '2026-05-05T14:00:00Z'),

  (v_l048, v_user,
    'https://tailwindcss.com/blog/tailwindcss-v4',
    'Tailwind CSS v4 — Migration Guide',
    'Breaking changes, new config format, the oxide engine upgrade, and a step-by-step migration from v3.',
    'tailwindcss.com', v_c_article, null, 'read', false,
    '2026-01-08T10:00:00Z', '2026-01-08T10:00:00Z'),

  (v_l049, v_user,
    'https://web.dev/articles/css-container-queries',
    'CSS Container Queries — A Practical Guide',
    'Why container queries change how you think about responsive components, with copy-paste examples.',
    'web.dev', v_c_article, null, 'unread', false,
    '2026-04-14T13:00:00Z', '2026-04-14T13:00:00Z'),

  (v_l050, v_user,
    'https://www.smashingmagazine.com/2026/01/building-accessible-forms/',
    'Building Accessible Forms — The Definitive Guide',
    'Labels, error messaging, focus management, ARIA, and testing your forms with a screen reader.',
    'smashingmagazine.com', v_c_article, null, 'read', false,
    '2026-01-22T11:00:00Z', '2026-01-22T11:00:00Z'),

  (v_l051, v_user,
    'https://auth0.com/blog/oauth2-oidc-explained/',
    'OAuth 2.0 and OIDC Explained — Once and for All',
    'Authorization vs. authentication, flows (PKCE, client credentials, device), and JWTs demystified.',
    'auth0.com', v_c_article, null, 'unread', false,
    '2026-03-05T10:00:00Z', '2026-03-05T10:00:00Z'),

  (v_l052, v_user,
    'https://2025.stateofjs.com/',
    'The State of JavaScript 2025',
    'Annual survey results: which libraries devs love or dread, meta-frameworks, runtimes, and what''s coming next.',
    'stateofjs.com', v_c_article, null, 'read', true,
    '2026-01-15T09:00:00Z', '2026-01-15T09:00:00Z'),

  (v_l053, v_user,
    'https://swyx.io/learn-in-public',
    'Learn in Public — The Fastest Way to Learn',
    'Write about what you learn, even if you''re wrong. The community corrects you and you level up faster.',
    'swyx.io', v_c_article, null, 'read', true,
    '2025-10-01T10:00:00Z', '2025-10-01T10:00:00Z'),

  (v_l054, v_user,
    'https://martinfowler.com/articles/micro-frontends.html',
    'Micro Frontends — Patterns and Anti-Patterns',
    'When micro-frontends make sense, the integration approaches, and the shared state problem nobody talks about.',
    'martinfowler.com', v_c_article, null, 'archived', false,
    '2025-08-10T14:00:00Z', '2025-08-10T14:00:00Z'),

  (v_l055, v_user,
    'https://google.github.io/eng-practices/review/',
    'Google Engineering — Code Review Best Practices',
    'How Google engineers think about code review: what to look for, how to give feedback, and reviewer speed.',
    'google.github.io', v_c_article, null, 'read', false,
    '2025-11-15T11:00:00Z', '2025-11-15T11:00:00Z'),

  (v_l056, v_user,
    'https://www.apollographql.com/blog/graphql-vs-rest',
    'GraphQL vs REST — A Developer''s Honest Take',
    'After using both in production: where GraphQL shines, where REST wins, and the over-fetching myth.',
    'apollographql.com', v_c_article, null, 'read', false,
    '2025-12-10T13:00:00Z', '2025-12-10T13:00:00Z'),

  (v_l057, v_user,
    'https://thenewstack.io/rust-is-eating-systems-programming/',
    'Rust Is Eating Systems Programming — Here Is Why',
    'Memory safety without GC, the borrow checker as a paradigm shift, and which industries are adopting Rust fastest.',
    'thenewstack.io', v_c_article, null, 'unread', false,
    '2026-02-05T09:00:00Z', '2026-02-05T09:00:00Z'),

  (v_l058, v_user,
    'https://dev.to/best-vscode-extensions-2026',
    '10 VS Code Extensions That Actually Make You Faster',
    'Curated list with honest takes — no filler. Each pick includes why it beats the alternatives.',
    'dev.to', v_c_article, null, 'read', false,
    '2026-04-30T10:00:00Z', '2026-04-30T10:00:00Z'),

  (v_l059, v_user,
    'https://kentcdodds.com/blog/the-testing-trophy',
    'The Testing Trophy — A Better Testing Strategy',
    'Why the old pyramid is wrong, how to balance unit, integration, and e2e tests, and what to test first.',
    'kentcdodds.com', v_c_article, null, 'read', true,
    '2025-09-20T11:00:00Z', '2025-09-20T11:00:00Z'),

  (v_l060, v_user,
    'https://www.patterns.dev/posts/rendering-patterns',
    'Rendering Patterns for the Modern Web',
    'SSG, SSR, ISR, PPR, streaming — when each pattern applies and the trade-offs in latency vs. freshness.',
    'patterns.dev', v_c_article, null, 'unread', false,
    '2026-05-03T14:00:00Z', '2026-05-03T14:00:00Z'),

  (v_l061, v_user,
    'https://danluu.com/developer-productivity/',
    'Developer Productivity — What Actually Moves the Needle',
    'Evidence-based look at what makes teams fast: small PRs, CI speed, test coverage, and psychological safety.',
    'danluu.com', v_c_article, null, 'read', false,
    '2025-10-15T10:00:00Z', '2025-10-15T10:00:00Z'),

  (v_l062, v_user,
    'https://www.joshwcomeau.com/css/styled-components/',
    'The Styled Components Pitfall (and How to Avoid It)',
    'Performance implications of CSS-in-JS at scale, SSR hydration costs, and the move back to utility classes.',
    'joshwcomeau.com', v_c_article, null, 'unread', false,
    '2026-04-22T11:00:00Z', '2026-04-22T11:00:00Z'),

  (v_l063, v_user,
    'https://interviewing.io/blog/how-to-pass-a-senior-dev-interview',
    'How to Pass a Senior Developer Interview in 2026',
    'Communication patterns, system design expectations, and the behavioral questions that actually trip people up.',
    'interviewing.io', v_c_article, 'Share with team', 'watching', false,
    '2026-05-14T09:00:00Z', '2026-05-14T09:00:00Z'),

  -- ── Courses (10 links) ──────────────────────────────────
  (v_l064, v_user,
    'https://www.theodinproject.com/',
    'The Odin Project — Full Stack Open Curriculum',
    'Free, community-maintained full-stack curriculum covering HTML, CSS, JavaScript, Node.js, and React.',
    'theodinproject.com', v_c_course, null, 'watching', false,
    '2025-08-01T10:00:00Z', '2025-08-01T10:00:00Z'),

  (v_l065, v_user,
    'https://css-for-js.dev/',
    'CSS for JavaScript Developers — Josh Comeau',
    'Deep course that finally makes CSS click for JS devs. Flow layout, flexbox, grid, and animations.',
    'css-for-js.dev', v_c_course, 'Worth every penny', 'read', true,
    '2025-09-01T10:00:00Z', '2025-09-01T10:00:00Z'),

  (v_l066, v_user,
    'https://epicreact.dev/',
    'Epic React — Kent C. Dodds',
    'The definitive React course. Patterns, performance, testing, and the React mental model from first principles.',
    'epicreact.dev', v_c_course, 'Working through module 4', 'watching', true,
    '2025-10-01T10:00:00Z', '2025-10-01T10:00:00Z'),

  (v_l067, v_user,
    'https://fireship.io/pro/',
    'Fireship Pro — Modern Web Dev Short Courses',
    'Snappy, high-density courses on modern stacks: Next.js, Svelte, Firebase, Docker, and more.',
    'fireship.io', v_c_course, null, 'watching', false,
    '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z'),

  (v_l068, v_user,
    'https://fullstackopen.com/',
    'Full Stack Open 2026 — University of Helsinki',
    'Free university-level course: React, Node.js, GraphQL, TypeScript, CI/CD, containers, and React Native.',
    'fullstackopen.com', v_c_course, null, 'unread', false,
    '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'),

  (v_l069, v_user,
    'https://learn.deeplearning.ai/langchain',
    'LangChain for LLM Application Development',
    'Andrew Ng''s short course on LangChain: chains, memory, agents, and Q&A over documents.',
    'learn.deeplearning.ai', v_c_course, null, 'unread', false,
    '2026-03-10T11:00:00Z', '2026-03-10T11:00:00Z'),

  (v_l070, v_user,
    'https://frontendmasters.com/courses/react-performance/',
    'React Performance — Frontend Masters',
    'Profiling, memoization pitfalls, code splitting, lazy loading, and Concurrent Mode in production.',
    'frontendmasters.com', v_c_course, null, 'read', false,
    '2025-11-01T10:00:00Z', '2025-11-01T10:00:00Z'),

  (v_l071, v_user,
    'https://www.coursera.org/specializations/algorithms',
    'Algorithms Specialization — Stanford on Coursera',
    'Tim Roughgarden''s four-course series: divide and conquer, graph search, greedy, dynamic programming, and NP.',
    'coursera.org', v_c_course, null, 'unread', false,
    '2026-04-08T09:00:00Z', '2026-04-08T09:00:00Z'),

  (v_l072, v_user,
    'https://www.executivebible.io/postgres',
    'PostgreSQL for Application Developers',
    'Row-level security, JSONB, full-text search, triggers, and partitioning for app developers not DBAs.',
    'executivebible.io', v_c_course, null, 'watching', false,
    '2026-03-28T14:00:00Z', '2026-03-28T14:00:00Z'),

  (v_l073, v_user,
    'https://testingjavascript.com/',
    'Testing JavaScript — Kent C. Dodds',
    'Unit, integration, and e2e testing with Jest, RTL, Cypress, and Playwright. How to actually test React apps.',
    'testingjavascript.com', v_c_course, null, 'unread', false,
    '2026-05-06T10:00:00Z', '2026-05-06T10:00:00Z'),

  -- ── Tweets (10 links) ───────────────────────────────────
  (v_l074, v_user,
    'https://x.com/dan_abramov/status/1234567890',
    'Dan Abramov on React Server Components',
    'Thread explaining the mental model behind React Server Components and why they matter for the future of web.',
    'x.com', v_c_tweet, null, 'unread', false,
    '2026-05-12T15:30:00Z', '2026-05-12T15:30:00Z'),

  (v_l075, v_user,
    'https://x.com/leeerob/status/2345678901',
    'Lee Robinson on Next.js 16 Release Highlights',
    'Quick thread on what changed in 16: PPR by default, improved caching, new dev tools, and breaking changes.',
    'x.com', v_c_tweet, null, 'unread', false,
    '2026-05-17T10:00:00Z', '2026-05-17T10:00:00Z'),

  (v_l076, v_user,
    'https://x.com/kentcdodds/status/3456789012',
    'Kent C. Dodds on Why He Tests Behavior Not Implementation',
    'The retweet-worthy thread on why testing internals creates false confidence and fragile test suites.',
    'x.com', v_c_tweet, null, 'read', true,
    '2026-01-10T09:00:00Z', '2026-01-10T09:00:00Z'),

  (v_l077, v_user,
    'https://x.com/t3dotgg/status/4567890123',
    'Theo on Why TypeScript Strict Mode Is Non-Negotiable',
    'Thread on the specific TS strict checks that catch real bugs vs. the ones that are just noise.',
    'x.com', v_c_tweet, null, 'read', false,
    '2026-02-20T11:00:00Z', '2026-02-20T11:00:00Z'),

  (v_l078, v_user,
    'https://x.com/TkDodo/status/5678901234',
    'TkDodo on the React Query Mental Model',
    'Why thinking of React Query as a "data fetching" library misses the point — it''s a server state synchronizer.',
    'x.com', v_c_tweet, null, 'read', true,
    '2025-12-15T13:00:00Z', '2025-12-15T13:00:00Z'),

  (v_l079, v_user,
    'https://x.com/shadcn/status/6789012345',
    'shadcn on the Philosophy Behind shadcn/ui',
    'Why the "install and own it" model beats npm packages for design systems. You should copy, not depend.',
    'x.com', v_c_tweet, null, 'watching', false,
    '2026-03-18T10:00:00Z', '2026-03-18T10:00:00Z'),

  (v_l080, v_user,
    'https://x.com/wesbos/status/7890123456',
    'Wes Bos on New Web Platform APIs You Should Know',
    'Thread on native View Transitions API, Popover API, and the dialog element landing in all browsers.',
    'x.com', v_c_tweet, null, 'unread', false,
    '2026-04-12T14:00:00Z', '2026-04-12T14:00:00Z'),

  (v_l081, v_user,
    'https://x.com/sarah_edo/status/8901234567',
    'Sarah Drasner on CSS Custom Properties as a Design Token System',
    'Thread showing how CSS variables + @layer create a themeable component system without any JS.',
    'x.com', v_c_tweet, null, 'read', false,
    '2025-10-25T11:00:00Z', '2025-10-25T11:00:00Z'),

  (v_l082, v_user,
    'https://x.com/ry/status/9012345678',
    'Ryan Dahl on Deno 2.0 and Node.js Compatibility',
    'The creator of Node.js explains why Deno 2.0 supports npm packages and what that means for the runtime wars.',
    'x.com', v_c_tweet, null, 'read', false,
    '2025-11-05T09:00:00Z', '2025-11-05T09:00:00Z'),

  (v_l083, v_user,
    'https://x.com/kelseyhightower/status/1098765432',
    'Kelsey Hightower on Kubernetes Maturity in 2026',
    'Why k8s won, what still hurts, and where the simplification work is finally happening.',
    'x.com', v_c_tweet, null, 'unread', false,
    '2026-05-19T16:00:00Z', '2026-05-19T16:00:00Z'),

  -- ── Instagram (7 links) ─────────────────────────────────
  (v_l084, v_user,
    'https://www.instagram.com/p/abc123',
    'UI Design Tips for Developers',
    'Quick visual tips for making your interfaces look polished and professional without a design background.',
    'instagram.com', v_c_instagram, 'Great color palette tips in here', 'read', true,
    '2026-05-07T09:00:00Z', '2026-05-07T09:00:00Z'),

  (v_l085, v_user,
    'https://www.instagram.com/p/glassmorph456',
    'Glassmorphism Design Inspiration Pack',
    'A collection of frosted glass UI components with real CSS code snippets for each card and modal.',
    'instagram.com', v_c_instagram, null, 'unread', false,
    '2026-03-22T12:00:00Z', '2026-03-22T12:00:00Z'),

  (v_l086, v_user,
    'https://www.instagram.com/p/workspace789',
    'Developer Workspace Setup Tour',
    'Minimal desk setup with dual monitors, custom keycaps, and the Neovim config breakdown.',
    'instagram.com', v_c_instagram, null, 'read', false,
    '2025-12-20T10:00:00Z', '2025-12-20T10:00:00Z'),

  (v_l087, v_user,
    'https://www.instagram.com/p/colortheory321',
    'Color Theory for Developers — Cheat Sheet',
    'Complementary, analogous, and triadic color pairs. How to build a palette from a single brand color.',
    'instagram.com', v_c_instagram, null, 'unread', false,
    '2026-04-05T11:00:00Z', '2026-04-05T11:00:00Z'),

  (v_l088, v_user,
    'https://www.instagram.com/p/terminal654',
    'Terminal Customization Showcase — zsh + Starship',
    'Before/after of a terminal glow-up using Starship prompt, Tokyo Night theme, and custom aliases.',
    'instagram.com', v_c_instagram, null, 'read', false,
    '2025-10-10T09:00:00Z', '2025-10-10T09:00:00Z'),

  (v_l089, v_user,
    'https://www.instagram.com/p/figmatips987',
    'Figma Tricks Every Developer Should Know',
    'Component variants, auto-layout for responsive mockups, and the Dev Mode handoff workflow.',
    'instagram.com', v_c_instagram, null, 'unread', false,
    '2026-02-18T14:00:00Z', '2026-02-18T14:00:00Z'),

  (v_l090, v_user,
    'https://www.instagram.com/p/cssart159',
    'CSS Art Gallery — 10 Pieces Made with Pure CSS',
    'Impressively complex illustrations made with nothing but CSS. Source links included in bio.',
    'instagram.com', v_c_instagram, null, 'archived', false,
    '2025-08-30T15:00:00Z', '2025-08-30T15:00:00Z'),

  -- ── TikTok (6 links) ────────────────────────────────────
  (v_l091, v_user,
    'https://www.tiktok.com/@codewithreact/video/123456',
    '5 TypeScript Tricks You Probably Don''t Know',
    'Short video covering advanced TypeScript patterns that most developers miss: conditional types to template literals.',
    'tiktok.com', v_c_tiktok, null, 'watching', false,
    '2026-05-11T20:00:00Z', '2026-05-11T20:00:00Z'),

  (v_l092, v_user,
    'https://www.tiktok.com/@csswizard/video/234567',
    'CSS One-Liner Hacks That Solve Real Problems',
    'aspect-ratio, clamp(), :has(), and logical properties — the CSS features that replace dozens of media queries.',
    'tiktok.com', v_c_tiktok, null, 'watching', false,
    '2026-04-16T19:00:00Z', '2026-04-16T19:00:00Z'),

  (v_l093, v_user,
    'https://www.tiktok.com/@gitmasters/video/345678',
    'Git Commands Every Developer Needs But Forgets',
    'git stash pop, bisect, reflog, and cherry-pick with real examples of when you''d actually use them.',
    'tiktok.com', v_c_tiktok, null, 'read', false,
    '2025-11-25T20:00:00Z', '2025-11-25T20:00:00Z'),

  (v_l094, v_user,
    'https://www.tiktok.com/@linuxdaily/video/456789',
    'Linux Terminal Shortcuts That Save Hours Every Week',
    'Ctrl+R reverse search, pushd/popd, process substitution, and brace expansion — all in 60 seconds each.',
    'tiktok.com', v_c_tiktok, null, 'unread', false,
    '2026-01-20T21:00:00Z', '2026-01-20T21:00:00Z'),

  (v_l095, v_user,
    'https://www.tiktok.com/@devproductivity/video/567890',
    'Debugging Tricks Nobody Talks About',
    'console.table, conditional breakpoints, performance.mark(), and Chrome DevTools network throttling tricks.',
    'tiktok.com', v_c_tiktok, null, 'watching', false,
    '2026-03-14T18:00:00Z', '2026-03-14T18:00:00Z'),

  (v_l096, v_user,
    'https://www.tiktok.com/@seniordev/video/678901',
    'The 10x Developer Productivity Stack in 2026',
    'AI coding assistants, custom VS Code snippets, dotfiles strategy, and the tools that eliminate friction.',
    'tiktok.com', v_c_tiktok, null, 'unread', false,
    '2026-05-09T20:00:00Z', '2026-05-09T20:00:00Z'),

  -- ── Other (4 links) ─────────────────────────────────────
  (v_l097, v_user,
    'https://excalidraw.com/',
    'Excalidraw — Virtual Whiteboard for Developers',
    'Sketch system diagrams, ERDs, and architecture diagrams that look hand-drawn. Perfect for async collaboration.',
    'excalidraw.com', v_c_other, 'Use for system design prep', 'watching', true,
    '2026-04-20T10:00:00Z', '2026-04-20T10:00:00Z'),

  (v_l098, v_user,
    'https://ray.so/',
    'Ray.so — Beautiful Code Screenshots',
    'Paste code and export beautiful images for blog posts, tweets, and slide decks. Supports syntax highlighting.',
    'ray.so', v_c_other, null, 'read', true,
    '2025-09-05T11:00:00Z', '2025-09-05T11:00:00Z'),

  (v_l099, v_user,
    'https://transform.tools/',
    'Transform.tools — Code Conversion Swiss Army Knife',
    'Convert JSON to TypeScript, SVG to JSX, CSS to JS, and more. Dozens of transformers, all in the browser.',
    'transform.tools', v_c_other, null, 'read', false,
    '2025-10-12T14:00:00Z', '2025-10-12T14:00:00Z'),

  (v_l100, v_user,
    'https://web.dev/explore/performance',
    'Web.dev — Performance Learning Path',
    'Google''s curated learning path for Core Web Vitals, loading performance, rendering, and runtime efficiency.',
    'web.dev', v_c_other, 'Go through before next perf sprint', 'watching', false,
    '2026-05-28T09:00:00Z', '2026-05-28T09:00:00Z');

  -- ----------------------------------------------------------
  -- Link ↔ Tag associations
  -- ----------------------------------------------------------
  insert into public.link_tags (link_id, tag_id) values
    -- 001 React 19 Deep Dive
    (v_l001, v_t_react), (v_l001, v_t_frontend),
    -- 002 Next.js App Router Course
    (v_l002, v_t_nextjs), (v_l002, v_t_react), (v_l002, v_t_frontend),
    -- 003 Tailwind v4 video
    (v_l003, v_t_tailwind), (v_l003, v_t_css),
    -- 004 Supabase Crash Course
    (v_l004, v_t_supabase), (v_l004, v_t_backend), (v_l004, v_t_database),
    -- 005 Building AI Apps
    (v_l005, v_t_ai), (v_l005, v_t_frontend), (v_l005, v_t_nextjs),
    -- 006 Rust for JS Devs
    (v_l006, v_t_rust), (v_l006, v_t_backend),
    -- 007 System Design Patterns
    (v_l007, v_t_arch), (v_l007, v_t_interviews), (v_l007, v_t_career),
    -- 008 CSS Animations Masterclass
    (v_l008, v_t_css), (v_l008, v_t_animation), (v_l008, v_t_frontend),
    -- 009 Docker for Developers
    (v_l009, v_t_docker), (v_l009, v_t_devops),
    -- 010 How Git Works
    (v_l010, v_t_git), (v_l010, v_t_tools),
    -- 011 GraphQL vs REST
    (v_l011, v_t_graphql), (v_l011, v_t_api), (v_l011, v_t_backend),
    -- 012 PostgreSQL Performance
    (v_l012, v_t_postgres), (v_l012, v_t_database), (v_l012, v_t_perf),
    -- 013 Design System from Scratch
    (v_l013, v_t_design), (v_l013, v_t_ui), (v_l013, v_t_frontend),
    -- 014 Future of AI
    (v_l014, v_t_ai), (v_l014, v_t_career),
    -- 015 SvelteKit vs Next.js
    (v_l015, v_t_svelte), (v_l015, v_t_nextjs), (v_l015, v_t_frontend),
    -- 016 Web Accessibility
    (v_l016, v_t_a11y), (v_l016, v_t_frontend),
    -- 017 Kubernetes for Devs
    (v_l017, v_t_kubernetes), (v_l017, v_t_devops),
    -- 018 Vim Motions
    (v_l018, v_t_tools), (v_l018, v_t_prod),
    -- 019 Live Senior Interview
    (v_l019, v_t_career), (v_l019, v_t_interviews),
    -- 020 Advanced TypeScript
    (v_l020, v_t_ts), (v_l020, v_t_frontend),
    -- 021 Bun vs Node.js
    (v_l021, v_t_nodejs), (v_l021, v_t_perf), (v_l021, v_t_tools),
    -- 022 React Testing Library
    (v_l022, v_t_testing), (v_l022, v_t_react), (v_l022, v_t_frontend),
    -- 023 tRPC in 30 Minutes
    (v_l023, v_t_ts), (v_l023, v_t_api), (v_l023, v_t_backend),
    -- 024 Edge Computing
    (v_l024, v_t_backend), (v_l024, v_t_perf),
    -- 025 CSS Grid Mastery
    (v_l025, v_t_css), (v_l025, v_t_frontend), (v_l025, v_t_reference),
    -- 026 Drizzle ORM
    (v_l026, v_t_database), (v_l026, v_t_backend), (v_l026, v_t_ts),
    -- 027 CLI Tool with TypeScript
    (v_l027, v_t_ts), (v_l027, v_t_nodejs), (v_l027, v_t_tools),
    -- 028 Web Performance Core Web Vitals
    (v_l028, v_t_perf), (v_l028, v_t_frontend), (v_l028, v_t_nextjs),
    -- 029 Next.js repo
    (v_l029, v_t_nextjs), (v_l029, v_t_react), (v_l029, v_t_framework),
    -- 030 shadcn/ui
    (v_l030, v_t_ui), (v_l030, v_t_design), (v_l030, v_t_react),
    -- 031 Tailwind CSS repo
    (v_l031, v_t_tailwind), (v_l031, v_t_css), (v_l031, v_t_frontend),
    -- 032 Supabase repo
    (v_l032, v_t_supabase), (v_l032, v_t_backend), (v_l032, v_t_database),
    -- 033 tRPC repo
    (v_l033, v_t_ts), (v_l033, v_t_api), (v_l033, v_t_backend),
    -- 034 Zod repo
    (v_l034, v_t_ts), (v_l034, v_t_tools), (v_l034, v_t_backend),
    -- 035 TanStack Query repo
    (v_l035, v_t_react), (v_l035, v_t_frontend), (v_l035, v_t_tools),
    -- 036 Drizzle ORM repo
    (v_l036, v_t_database), (v_l036, v_t_ts), (v_l036, v_t_oss),
    -- 037 Lucia auth repo
    (v_l037, v_t_auth), (v_l037, v_t_backend), (v_l037, v_t_security),
    -- 038 Hono repo
    (v_l038, v_t_backend), (v_l038, v_t_api), (v_l038, v_t_nodejs),
    -- 039 Bun repo
    (v_l039, v_t_nodejs), (v_l039, v_t_tools), (v_l039, v_t_perf),
    -- 040 Astro repo
    (v_l040, v_t_frontend), (v_l040, v_t_framework),
    -- 041 Expo repo
    (v_l041, v_t_mobile), (v_l041, v_t_react),
    -- 042 LangChain.js repo
    (v_l042, v_t_ai), (v_l042, v_t_backend),
    -- 043 Biome repo
    (v_l043, v_t_tools), (v_l043, v_t_ts), (v_l043, v_t_frontend),
    -- 044 JS Closures article
    (v_l044, v_t_js), (v_l044, v_t_frontend), (v_l044, v_t_reference),
    -- 045 Flexbox Guide
    (v_l045, v_t_css), (v_l045, v_t_flexbox), (v_l045, v_t_reference),
    -- 046 TypeScript docs
    (v_l046, v_t_ts), (v_l046, v_t_docs),
    -- 047 Supabase Auth SSR Guide
    (v_l047, v_t_supabase), (v_l047, v_t_auth), (v_l047, v_t_backend),
    -- 048 Tailwind v4 migration
    (v_l048, v_t_tailwind), (v_l048, v_t_css), (v_l048, v_t_frontend),
    -- 049 CSS Container Queries
    (v_l049, v_t_css), (v_l049, v_t_frontend),
    -- 050 Accessible Forms
    (v_l050, v_t_a11y), (v_l050, v_t_frontend), (v_l050, v_t_ui),
    -- 051 OAuth 2.0 OIDC
    (v_l051, v_t_auth), (v_l051, v_t_security), (v_l051, v_t_backend),
    -- 052 State of JS 2025
    (v_l052, v_t_js), (v_l052, v_t_frontend), (v_l052, v_t_reference),
    -- 053 Learn in Public
    (v_l053, v_t_career), (v_l053, v_t_prod),
    -- 054 Micro Frontends
    (v_l054, v_t_arch), (v_l054, v_t_frontend),
    -- 055 Code Review Best Practices
    (v_l055, v_t_career), (v_l055, v_t_tools),
    -- 056 GraphQL vs REST article
    (v_l056, v_t_graphql), (v_l056, v_t_api), (v_l056, v_t_backend),
    -- 057 Rust Systems Programming
    (v_l057, v_t_rust), (v_l057, v_t_backend), (v_l057, v_t_perf),
    -- 058 VS Code Extensions
    (v_l058, v_t_tools), (v_l058, v_t_prod),
    -- 059 Testing Trophy
    (v_l059, v_t_testing), (v_l059, v_t_career),
    -- 060 Rendering Patterns
    (v_l060, v_t_nextjs), (v_l060, v_t_perf), (v_l060, v_t_arch),
    -- 061 Developer Productivity
    (v_l061, v_t_prod), (v_l061, v_t_career),
    -- 062 Styled Components Pitfall
    (v_l062, v_t_css), (v_l062, v_t_frontend), (v_l062, v_t_perf),
    -- 063 Senior Dev Interview article
    (v_l063, v_t_career), (v_l063, v_t_interviews),
    -- 064 Odin Project course
    (v_l064, v_t_frontend), (v_l064, v_t_backend), (v_l064, v_t_docs),
    -- 065 CSS for JS Devs course
    (v_l065, v_t_css), (v_l065, v_t_frontend), (v_l065, v_t_design),
    -- 066 Epic React course
    (v_l066, v_t_react), (v_l066, v_t_frontend), (v_l066, v_t_perf),
    -- 067 Fireship Pro
    (v_l067, v_t_frontend), (v_l067, v_t_tools),
    -- 068 Full Stack Open
    (v_l068, v_t_frontend), (v_l068, v_t_backend), (v_l068, v_t_docs),
    -- 069 LangChain AI course
    (v_l069, v_t_ai), (v_l069, v_t_backend),
    -- 070 React Performance FM
    (v_l070, v_t_react), (v_l070, v_t_perf), (v_l070, v_t_frontend),
    -- 071 Algorithms Coursera
    (v_l071, v_t_algorithms), (v_l071, v_t_career), (v_l071, v_t_interviews),
    -- 072 PostgreSQL for App Devs
    (v_l072, v_t_postgres), (v_l072, v_t_database), (v_l072, v_t_backend),
    -- 073 Testing JavaScript course
    (v_l073, v_t_testing), (v_l073, v_t_react), (v_l073, v_t_frontend),
    -- 074 Dan Abramov RSC tweet
    (v_l074, v_t_react), (v_l074, v_t_rsc),
    -- 075 Lee Robinson Next.js tweet
    (v_l075, v_t_nextjs), (v_l075, v_t_frontend),
    -- 076 Kent C. Dodds testing tweet
    (v_l076, v_t_testing), (v_l076, v_t_frontend), (v_l076, v_t_career),
    -- 077 Theo TypeScript tweet
    (v_l077, v_t_ts), (v_l077, v_t_frontend),
    -- 078 TkDodo React Query tweet
    (v_l078, v_t_react), (v_l078, v_t_frontend),
    -- 079 shadcn design system tweet
    (v_l079, v_t_design), (v_l079, v_t_ui),
    -- 080 Wes Bos Web APIs tweet
    (v_l080, v_t_frontend), (v_l080, v_t_js),
    -- 081 Sarah Drasner CSS tweet
    (v_l081, v_t_css), (v_l081, v_t_design),
    -- 082 Ryan Dahl Deno tweet
    (v_l082, v_t_nodejs), (v_l082, v_t_backend),
    -- 083 Kelsey Hightower k8s tweet
    (v_l083, v_t_kubernetes), (v_l083, v_t_devops),
    -- 084 UI Design Tips Instagram
    (v_l084, v_t_design), (v_l084, v_t_ui),
    -- 085 Glassmorphism Instagram
    (v_l085, v_t_design), (v_l085, v_t_css), (v_l085, v_t_ui),
    -- 086 Workspace Tour Instagram
    (v_l086, v_t_tools), (v_l086, v_t_prod),
    -- 087 Color Theory Instagram
    (v_l087, v_t_design), (v_l087, v_t_ui), (v_l087, v_t_frontend),
    -- 088 Terminal Customization Instagram
    (v_l088, v_t_tools), (v_l088, v_t_prod),
    -- 089 Figma Tips Instagram
    (v_l089, v_t_design), (v_l089, v_t_tools), (v_l089, v_t_ui),
    -- 090 CSS Art Instagram
    (v_l090, v_t_css), (v_l090, v_t_design),
    -- 091 5 TS Tricks TikTok
    (v_l091, v_t_ts), (v_l091, v_t_tips),
    -- 092 CSS One-Liners TikTok
    (v_l092, v_t_css), (v_l092, v_t_tips), (v_l092, v_t_frontend),
    -- 093 Git Commands TikTok
    (v_l093, v_t_git), (v_l093, v_t_tips), (v_l093, v_t_tools),
    -- 094 Linux Terminal TikTok
    (v_l094, v_t_tips), (v_l094, v_t_tools), (v_l094, v_t_prod),
    -- 095 Debugging Tricks TikTok
    (v_l095, v_t_tips), (v_l095, v_t_tools), (v_l095, v_t_frontend),
    -- 096 10x Dev Stack TikTok
    (v_l096, v_t_prod), (v_l096, v_t_tools), (v_l096, v_t_ai),
    -- 097 Excalidraw
    (v_l097, v_t_tools), (v_l097, v_t_design), (v_l097, v_t_prod),
    -- 098 Ray.so
    (v_l098, v_t_tools), (v_l098, v_t_design),
    -- 099 Transform.tools
    (v_l099, v_t_tools), (v_l099, v_t_frontend),
    -- 100 Web.dev Performance
    (v_l100, v_t_perf), (v_l100, v_t_frontend), (v_l100, v_t_docs);

end $$;
