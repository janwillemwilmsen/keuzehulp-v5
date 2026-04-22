-- 20260422_questionnaire_show_debug.sql
--
-- Per-questionnaire toggle that, when enabled, makes the results page show
-- a detailed scoring breakdown (intermediate scores, min/max ranges, base %,
-- adjustments, ceilings, final %). Meant for CMS users to debug/tune their
-- matrix without having to dig into the code.
--
-- Default off so anything existing keeps its clean, user-facing behaviour.

BEGIN;

ALTER TABLE public.questionnaires
    ADD COLUMN IF NOT EXISTS show_debug BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
