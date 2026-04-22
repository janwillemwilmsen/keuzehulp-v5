-- 20260422_scoring_settings.sql
--
-- Adds a singleton `scoring_settings` table that exposes the tunable
-- parameters of the MAUT scoring engine to the admin UI.
--
-- Only one row can ever exist (enforced via a CHECK on the TEXT primary key)
-- so the app can always do `.eq('id', 'default').single()` without branching.

BEGIN;

CREATE TABLE IF NOT EXISTS public.scoring_settings (
    id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),

    -- After normalising raw scores to 0–100%, clamp the BASE value to this
    -- minimum. Prevents a contract type from visually collapsing to 0% just
    -- because every answer scored slightly against it.
    base_min_percentage     INTEGER NOT NULL DEFAULT 20
        CHECK (base_min_percentage BETWEEN 0 AND 100),

    -- Absolute floor applied AFTER the ±adjustment. Never shown below this.
    final_min_percentage    INTEGER NOT NULL DEFAULT 15
        CHECK (final_min_percentage BETWEEN 0 AND 100),

    -- Maximum absolute fine-tuning (in percentage points) driven by the
    -- mix of positive / neutral / negative rationales picked up along the way.
    -- adjustment = ((positive - negative) / total) * adjustment_max_points
    adjustment_max_points   INTEGER NOT NULL DEFAULT 5
        CHECK (adjustment_max_points BETWEEN 0 AND 50),

    -- Ceiling applied when at least one neutral or negative rationale is
    -- present. Ensures "not perfect" contracts can never display 100%.
    non_optimal_ceiling     INTEGER NOT NULL DEFAULT 95
        CHECK (non_optimal_ceiling BETWEEN 0 AND 100),

    -- Ceiling applied when every rationale is positive.
    optimal_ceiling         INTEGER NOT NULL DEFAULT 100
        CHECK (optimal_ceiling BETWEEN 0 AND 100),

    -- Fallback percentage used when a contract type has no scorable range
    -- at all (e.g. every answer scored 0 for it). 50% = "no opinion".
    neutral_when_empty_percentage INTEGER NOT NULL DEFAULT 50
        CHECK (neutral_when_empty_percentage BETWEEN 0 AND 100),

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.scoring_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

COMMIT;
