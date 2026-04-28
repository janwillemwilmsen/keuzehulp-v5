-- 20260428_answer_description.sql
--
-- Optional helper text shown directly under each answer in the wizard.
-- Lets editors give a bit more context to a choice ("ik woon alleen",
-- "een gezin met kinderen", …) without cluttering the main answer label.
--
-- Nullable / no default — answers without a description simply render
-- nothing extra in the wizard.

BEGIN;

ALTER TABLE public.answers
    ADD COLUMN IF NOT EXISTS description TEXT;

COMMIT;
