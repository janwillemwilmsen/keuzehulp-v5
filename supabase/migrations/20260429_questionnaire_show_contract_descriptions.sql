-- 20260429_questionnaire_show_contract_descriptions.sql
--
-- Per-questionnaire toggle that swaps the result-card body from the
-- per-rationale bullet lists (Goed passend / Redelijk passend / Houd hier
-- rekening mee) to the global product description maintained in
-- /admin/contract-types. When this is on, the inline description replaces
-- the bullets and the "Uitleg" link (which would just open the same copy
-- in a modal) is hidden — there's no point showing both.
--
-- Default off, so existing questionnaires keep their current look.

BEGIN;

ALTER TABLE public.questionnaires
    ADD COLUMN IF NOT EXISTS show_contract_descriptions BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
