-- Supabase Schema for Keuzehulp Wizard v5

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    -- Brand colors injected as CSS variables on the wizard pages.
    -- Managed from /admin/brand-themes.
    color_background         TEXT NOT NULL DEFAULT '#ffffff',
    color_primary            TEXT NOT NULL DEFAULT '#111111',
    color_primary_foreground TEXT NOT NULL DEFAULT '#ffffff',
    color_title              TEXT NOT NULL DEFAULT '#111111',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Types (global)
CREATE TABLE IF NOT EXISTS public.contract_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier <-> Contract Type mapping (which contracts does each supplier offer?)
-- This is the table that makes the engine supplier-aware.
-- Essent: variabel, vast1, vast3, dynamisch
-- Energiedirect: variabel, vast1, vast2, vast3, dynamisch, timeofuse
CREATE TABLE IF NOT EXISTS public.supplier_contract_types (
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    contract_type_id UUID REFERENCES public.contract_types(id) ON DELETE CASCADE,
    PRIMARY KEY (supplier_id, contract_type_id)
);

-- Questionnaires
CREATE TABLE IF NOT EXISTS public.questionnaires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    intro_text TEXT,
    usps TEXT[],
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT true,  -- Direct save, no drafts
    show_debug BOOLEAN NOT NULL DEFAULT FALSE, -- shows scoring breakdown on the results page
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questionnaire <-> Contract Type mapping.
-- Per-questionnaire override of which contract types are in scope.
-- Seeded from supplier_contract_types when a questionnaire is created,
-- but after that admins can toggle types on/off per questionnaire.
CREATE TABLE IF NOT EXISTS public.questionnaire_contract_types (
    questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    contract_type_id UUID REFERENCES public.contract_types(id) ON DELETE CASCADE,
    PRIMARY KEY (questionnaire_id, contract_type_id)
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'open')),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answers
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answer Scores & Rationale
-- One row per (answer, contract_type). The visual sentiment
-- (positive / neutral / negative) is derived from the sign of `score`
-- at read time, so it never drifts from what the admin actually configured.
CREATE TABLE IF NOT EXISTS public.answer_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID REFERENCES public.answers(id) ON DELETE CASCADE,
    contract_type_id UUID REFERENCES public.contract_types(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    explanation_text TEXT, -- rationale: why this answer makes this contract (un)suitable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(answer_id, contract_type_id)
);

-- Scoring Settings (singleton row of tunable engine parameters).
-- See supabase/migrations/20260422_scoring_settings.sql for field docs.
CREATE TABLE IF NOT EXISTS public.scoring_settings (
    id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
    base_min_percentage     INTEGER NOT NULL DEFAULT 20  CHECK (base_min_percentage BETWEEN 0 AND 100),
    final_min_percentage    INTEGER NOT NULL DEFAULT 15  CHECK (final_min_percentage BETWEEN 0 AND 100),
    adjustment_max_points   INTEGER NOT NULL DEFAULT 5   CHECK (adjustment_max_points BETWEEN 0 AND 50),
    non_optimal_ceiling     INTEGER NOT NULL DEFAULT 95  CHECK (non_optimal_ceiling BETWEEN 0 AND 100),
    optimal_ceiling         INTEGER NOT NULL DEFAULT 100 CHECK (optimal_ceiling BETWEEN 0 AND 100),
    neutral_when_empty_percentage INTEGER NOT NULL DEFAULT 50 CHECK (neutral_when_empty_percentage BETWEEN 0 AND 100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SEED DATA — run this after CREATE TABLE statements
-- ============================================================

-- Suppliers
INSERT INTO public.suppliers (name, slug) VALUES
  ('Essent', 'essent'),
  ('Energiedirect', 'energiedirect')
ON CONFLICT (slug) DO NOTHING;

-- Contract Types (all possible types across all suppliers)
INSERT INTO public.contract_types (slug, name, description, order_index) VALUES
  ('variabel',  'Variabel',      'Prijs volgt de markt maandelijks',    1),
  ('vast1',     'Vast 1 jaar',   '1 jaar vaste tarieven',               2),
  ('vast2',     'Vast 2 jaar',   '2 jaar vaste tarieven',               3),
  ('vast3',     'Vast 3 jaar',   '3 jaar vaste tarieven',               4),
  ('dynamisch', 'Dynamisch',     'Uurprijzen op basis van energiebeurs', 5),
  ('timeofuse', 'Time of Use',   'Dal/Normaal/Piek tarieven',           6)
ON CONFLICT (slug) DO UPDATE SET
  order_index = EXCLUDED.order_index,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Scoring Settings seed row
INSERT INTO public.scoring_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Supplier <-> Contract Type mapping
-- Essent (no vast2)
INSERT INTO public.supplier_contract_types (supplier_id, contract_type_id)
SELECT s.id, ct.id
FROM public.suppliers s, public.contract_types ct
WHERE s.slug = 'essent'
  AND ct.slug IN ('variabel', 'vast1', 'vast3', 'dynamisch')
ON CONFLICT DO NOTHING;

-- Energiedirect (all 6 types)
INSERT INTO public.supplier_contract_types (supplier_id, contract_type_id)
SELECT s.id, ct.id
FROM public.suppliers s, public.contract_types ct
WHERE s.slug = 'energiedirect'
  AND ct.slug IN ('variabel', 'vast1', 'vast2', 'vast3', 'dynamisch', 'timeofuse')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Row Level Security (enable in production)
-- ============================================================
-- ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public can view published" ON public.questionnaires FOR SELECT USING (is_published = true);
-- CREATE POLICY "Admins can do everything" ON public.questionnaires FOR ALL USING (auth.role() = 'authenticated');
