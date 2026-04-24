-- 20260424_questionnaire_contract_types.sql
--
-- Per-questionnaire contract-type configuration. Previously the set of
-- contracts shown in the scoring matrix (and in the wizard results) came
-- directly from `supplier_contract_types`, meaning every questionnaire of
-- a given supplier offered the exact same list.
--
-- With this table admins can decide per-questionnaire which of the global
-- contract types are in scope. The display order stays driven by
-- `contract_types.order_index` so the canonical order
-- (Variabel | Vast 1 jaar | Vast 2 jaar | Vast 3 jaar | Dynamisch | Time of Use)
-- is preserved everywhere.
--
-- Backfill: every existing questionnaire is seeded with the contract
-- types its supplier currently offers, so behaviour before/after this
-- migration is identical until an admin changes something.

BEGIN;

CREATE TABLE IF NOT EXISTS public.questionnaire_contract_types (
    questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    contract_type_id UUID REFERENCES public.contract_types(id) ON DELETE CASCADE,
    PRIMARY KEY (questionnaire_id, contract_type_id)
);

-- Backfill from supplier_contract_types (no-op on conflict so this
-- migration stays idempotent).
INSERT INTO public.questionnaire_contract_types (questionnaire_id, contract_type_id)
SELECT q.id, sct.contract_type_id
FROM public.questionnaires q
JOIN public.supplier_contract_types sct ON sct.supplier_id = q.supplier_id
ON CONFLICT DO NOTHING;

COMMIT;
