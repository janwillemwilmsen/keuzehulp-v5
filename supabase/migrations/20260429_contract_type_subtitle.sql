-- 20260429_contract_type_subtitle.sql
--
-- Short, customer-facing one-liner shown directly under the contract name
-- on the wizard results page. Editable from the same /admin/contract-types
-- page that already maintains `description`.
--
-- Nullable / no default — contracts without a subtitle simply render
-- nothing extra under their name.

BEGIN;

ALTER TABLE public.contract_types
    ADD COLUMN IF NOT EXISTS subtitle TEXT;

COMMIT;
