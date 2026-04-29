-- 20260429_drop_show_contract_descriptions.sql
--
-- Rolls back the short-lived `show_contract_descriptions` toggle on the
-- questionnaires table. The product description is now always shown on
-- the results page, with the per-rationale bullets tucked into a
-- <details> "Waarom past dit bij mij?" disclosure — so a per-questionnaire
-- override is no longer meaningful.
--
-- Idempotent: safe to run whether or not the previous migration was applied.

BEGIN;

ALTER TABLE public.questionnaires
    DROP COLUMN IF EXISTS show_contract_descriptions;

COMMIT;
