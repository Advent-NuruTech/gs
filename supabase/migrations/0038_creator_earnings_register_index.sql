-- Supports the admin transaction register's stable newest-first pagination.
create index if not exists idx_creator_earnings_register
  on public.creator_earnings (created_at desc, id desc);
