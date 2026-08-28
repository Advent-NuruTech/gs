-- Let admins hide customization for products that are sold as-is.
-- Existing products keep their current behavior.
alter table designs
  add column if not exists customization_enabled boolean not null default true;

comment on column designs.customization_enabled is
  'When false, customization options are hidden from the public marketplace and product page.';
