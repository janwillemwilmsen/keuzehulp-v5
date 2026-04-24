-- 20260424_supplier_brand_colors.sql
--
-- Per-supplier brand colors. These values are injected as CSS variables
-- (--background, --primary, --primary-foreground) on the wizard pages,
-- so each supplier gets its own look & feel:
--   * Essent         → magenta
--   * Energiedirect  → green
--
-- Editable via /admin/brand-themes. Stored as plain CSS color strings
-- (typically hex) so the admin UI can round-trip them through a native
-- <input type="color"> without any conversion.

BEGIN;

ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS color_background TEXT NOT NULL DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS color_primary TEXT NOT NULL DEFAULT '#111111',
    ADD COLUMN IF NOT EXISTS color_primary_foreground TEXT NOT NULL DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS color_title TEXT NOT NULL DEFAULT '#111111';

-- Seed sensible baselines. Re-running the migration will NOT overwrite
-- values the admin has since tweaked (we only set rows whose colors are
-- still at the table default).
UPDATE public.suppliers
SET color_background         = '#fff5fa',
    color_primary            = '#e6007e',
    color_primary_foreground = '#ffffff',
    color_title              = '#8a0049'
WHERE slug = 'essent'
  AND color_primary = '#111111';

UPDATE public.suppliers
SET color_background         = '#f3faf6',
    color_primary            = '#00a651',
    color_primary_foreground = '#ffffff',
    color_title              = '#005a2b'
WHERE slug = 'energiedirect'
  AND color_primary = '#111111';

COMMIT;
