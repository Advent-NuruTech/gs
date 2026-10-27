-- Creator-controlled digital-product delivery. Existing products retain their
-- established downloadable behaviour until a creator explicitly chooses
-- reader-only access.
alter table designs
  add column if not exists delivery_mode text not null default 'download';

do $$ begin
  alter table designs
    add constraint designs_delivery_mode_check
    check (delivery_mode in ('download', 'online_only'));
exception when duplicate_object then null; end $$;

comment on column designs.delivery_mode is
  'download lets customers obtain the original file; online_only restricts AdventSkool delivery to the authenticated reader.';
