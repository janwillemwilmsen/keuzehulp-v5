-- 20260422_simplify_explanations.sql
--
-- Consolidates the explanation data model:
--   * Drops the 3 per-question explanation columns (explanation_positive /
--     _neutral / _negative) from `questions` — the rationale now lives at
--     the answer × contract-type level only.
--   * Drops the `explanation_type` column from `answer_scores` — the
--     sentiment is now derived at read time from the sign of `score`.
--   * Collapses the unique key on `answer_scores` so there is exactly
--     one row per (answer, contract_type) (matching how the app upserts).
--
-- This migration is idempotent and safe to run on an existing database.
-- Run BEFORE deploying the matching application changes.

BEGIN;

-- 1. answer_scores: collapse to one row per (answer, contract_type).
--    If legacy duplicates exist (one per explanation_type), keep the row
--    with the largest absolute score; ties keep the most recent.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY answer_id, contract_type_id
            ORDER BY ABS(score) DESC, created_at DESC
        ) AS rn
    FROM public.answer_scores
)
DELETE FROM public.answer_scores a
USING ranked r
WHERE a.id = r.id
  AND r.rn > 1;

-- 2. Drop the old compound unique constraint if it exists,
--    then add the new one.
ALTER TABLE public.answer_scores
    DROP CONSTRAINT IF EXISTS answer_scores_answer_id_contract_type_id_explanation_type_key;

-- Guard: only add the new unique if it isn't already there.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'answer_scores_answer_id_contract_type_id_key'
          AND conrelid = 'public.answer_scores'::regclass
    ) THEN
        ALTER TABLE public.answer_scores
            ADD CONSTRAINT answer_scores_answer_id_contract_type_id_key
            UNIQUE (answer_id, contract_type_id);
    END IF;
END$$;

-- 3. Drop the now-redundant sentiment column.
ALTER TABLE public.answer_scores
    DROP COLUMN IF EXISTS explanation_type;

-- 4. Drop the question-level explanation columns.
ALTER TABLE public.questions
    DROP COLUMN IF EXISTS explanation_positive,
    DROP COLUMN IF EXISTS explanation_neutral,
    DROP COLUMN IF EXISTS explanation_negative;

COMMIT;
