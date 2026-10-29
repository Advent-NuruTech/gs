-- Keep existing customization choices; only new products default to disabled.
alter table public.designs alter column customization_enabled set default false;
alter table public.designs add column if not exists preview_page_count integer;
alter table public.designs add constraint designs_preview_page_count_positive
  check (preview_page_count is null or preview_page_count > 0);
comment on column public.designs.preview_page_count is
  'Optional number of PDF pages in the public preview; null uses the default quarter.';
