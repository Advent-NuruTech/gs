-- ============================================================================
-- Design templates can now be PDFs as well as flat images. `image_url` keeps
-- holding a preview the gallery can render (for PDFs this is a first-page JPG
-- derived from the upload); `file_url` holds the original deliverable that is
-- served on download. `file_type` drives badges + download delivery.
-- ============================================================================
alter table designs
  add column if not exists file_url text,
  add column if not exists file_type text not null default 'image';

-- Backfill existing rows: their deliverable is the image itself.
update designs set file_url = image_url where file_url is null and image_url <> '';
