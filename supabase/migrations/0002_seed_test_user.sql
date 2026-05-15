-- ============================================================
-- Seed: test user for local development
-- email:    test@linkvault.dev
-- password: password123
-- id:       00000000-0000-0000-0000-000000000001
-- ============================================================

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  is_super_admin
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@linkvault.dev',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "test@linkvault.dev", "email_verified": true, "phone_verified": false}',
  now(),
  now(),
  '',
  '',
  '',
  '',
  false
);

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at,
  last_sign_in_at
) values (
  '00000000-0000-0000-0003-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "test@linkvault.dev", "email_verified": true, "phone_verified": false}',
  'email',
  now(),
  now(),
  now()
);
