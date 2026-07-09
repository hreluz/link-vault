-- ============================================================
-- Allow a user to delete their own vault key row.
--
-- Needed by the "restart account" flow: after a password reset,
-- the old wrapped_dek is unrecoverable (it was wrapped with a KEK
-- derived from the forgotten password), so the row must be deleted
-- to let VaultContext.unlock() bootstrap a fresh DEK. Only
-- select/insert/update existed on this table before now.
-- ============================================================

create policy "user_encryption_keys: delete own" on public.user_encryption_keys
  for delete using (auth.uid() = user_id);

grant delete on public.user_encryption_keys to authenticated;
