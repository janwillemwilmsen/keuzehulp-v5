/**
 * Keuzehulp MAUT Scoring Engine
 *
 * Works entirely off the dynamic data structure fetched from Supabase:
 *   questionnaire.questions[].answers[].answer_scores[].contract_types{ slug, name }
 *
 * The contract_type_id in answer_scores is a UUID. We always resolve
 * the slug/name via the nested contract_types join — never via string matching on the UUID.
 */

export interface ContractResult {
  slug: string;
  name: string;
  // Short one-liner shown directly under the contract name on the results
  // page. Maintained alongside `description` in /admin/contract-types.
  subtitle: string | null;
  // Long-form customer-facing copy maintained in /admin/contract-types.
  // Rendered as the body of each contract card on the results page.
  description: string | null;
  percentage: number;
  explanations: {
    text: string;
    // Derived from the sign of the underlying answer_scores.score at calc time;
    // not persisted as its own column anymore.
    type: 'positive' | 'neutral' | 'negative';
  }[];
}

/**
 * Tunable parameters of the scoring engine. Editable via the admin
 * "Rekenregels" page (table `scoring_settings`, singleton row id='default').
 * Every field is in percentage points.
 */
export interface ScoringSettings {
  base_min_percentage: number;           // floor applied to the normalised (base) percentage
  final_min_percentage: number;          // absolute floor applied after fine-tuning
  adjustment_max_points: number;         // max absolute ±adjustment from sentiment mix
  non_optimal_ceiling: number;           // cap when any neutral/negative rationale is present
  optimal_ceiling: number;               // cap when all rationales are positive
  neutral_when_empty_percentage: number; // fallback when score range is 0
}

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  base_min_percentage: 20,
  final_min_percentage: 15,
  adjustment_max_points: 5,
  non_optimal_ceiling: 95,
  optimal_ceiling: 100,
  neutral_when_empty_percentage: 50,
};

/**
 * A full trace of how the scoring engine arrived at each contract's final
 * percentage. Produced by `calculateResultsDebug` and rendered on the
 * results page when a questionnaire has `show_debug = true`.
 */
export interface ResultsTrace {
  settings: ScoringSettings;
  contractTypes: { slug: string; name: string }[];
  questions: Array<{
    id: string;
    text: string;
    type: string;
    chosenAnswers: Array<{ id: string; text: string }>;
    perContract: Array<{
      slug: string;
      questionMin: number;
      questionMax: number;
      contribution: number; // sum of chosen answers' scores for this contract on this question
    }>;
  }>;
  perContract: Array<{
    slug: string;
    name: string;
    rawScore: number;
    minScore: number;
    maxScore: number;
    basePercentageRaw: number; // before clamping
    basePercentage: number;    // after clamping (min floor + 100% cap)
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    adjustment: number;        // ± points applied from rationale sentiment mix
    ceilingApplied: number;    // optimal_ceiling or non_optimal_ceiling
    finalPercentage: number;
  }>;
}

/**
 * Collects the contract types that are in scope for a questionnaire.
 *
 * Prefers the per-questionnaire `questionnaire_contract_types` list when
 * it is present (new model — admin explicitly picks which contracts appear).
 * Falls back to scanning `answer_scores` for older data that predates
 * the junction table. Either way, the result is sorted by
 * `contract_types.order_index` so the canonical order is preserved:
 * Variabel | Vast 1 jaar | Vast 2 jaar | Vast 3 jaar | Dynamisch | Time of Use.
 */
export function collectContractTypes(
  questionsOrData: any,
): {
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  order_index: number;
}[] {
  // Accept either a full questionnaireData object or the bare questions array
  // so existing callers passing `questions` keep working.
  const questionnaireData =
    Array.isArray(questionsOrData) ? { questions: questionsOrData } : (questionsOrData ?? {});
  const questions: any[] = questionnaireData.questions ?? [];

  const qct = questionnaireData.questionnaire_contract_types;
  if (Array.isArray(qct) && qct.length > 0) {
    return qct
      .map((row: any) => row.contract_types)
      .filter(Boolean)
      .map((ct: any) => ({
        slug: ct.slug,
        name: ct.name ?? ct.slug,
        subtitle: ct.subtitle ?? null,
        description: ct.description ?? null,
        order_index: ct.order_index ?? 99,
      }))
      .sort((a, b) => a.order_index - b.order_index);
  }

  // Fallback: derive from answer_scores (legacy behaviour).
  // The answer_scores join doesn't include `subtitle`/`description`, so they
  // stay null until the questionnaire is migrated onto
  // questionnaire_contract_types.
  const seen = new Map<
    string,
    { name: string; subtitle: string | null; description: string | null; order_index: number }
  >();
  questions.forEach(q => {
    (q.answers || []).forEach((a: any) => {
      (a.answer_scores || []).forEach((s: any) => {
        const ct = s.contract_types;
        if (ct?.slug && !seen.has(ct.slug)) {
          seen.set(ct.slug, {
            name: ct.name ?? ct.slug,
            subtitle: ct.subtitle ?? null,
            description: ct.description ?? null,
            order_index: ct.order_index ?? 99,
          });
        }
      });
    });
  });
  return Array.from(seen.entries())
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => a.order_index - b.order_index);
}

/**
 * For a single question, finds the maximum possible raw score for each contract type.
 *
 * For SINGLE-select questions: the best achievable score is the max over all answers.
 * For MULTI-select questions: all answers can be selected simultaneously, so the
 * maximum is the SUM of all positive-score answers (only count positive contributions;
 * a user would never choose a negative-scoring option if they could avoid it, so we
 * model this conservatively — but since multi-select is free choice we sum all answers
 * to find the theoretical ceiling).
 *
 * NOTE: The spec says multi-select accumulates scores from every selected option.
 * The maximum is therefore the sum of ALL answers for multi-select, and the single
 * best answer for single-select.
 */
function questionMax(question: any, slug: string): number {
  const scores: number[] = (question.answers || []).map((a: any) => {
    const scoreRow = (a.answer_scores || []).find(
      (s: any) => s.contract_types?.slug === slug
    );
    return scoreRow?.score ?? 0;
  });
  if (scores.length === 0) return 0;
  if (question.type === 'multiple') {
    // Sum of all non-negative scores (best case for multi-select)
    return scores.filter(v => v > 0).reduce((acc, v) => acc + v, 0);
  }
  return Math.max(...scores);
}

/**
 * Same reasoning for minimum: single-select picks the worst answer;
 * multi-select could theoretically select all negative options.
 */
function questionMin(question: any, slug: string): number {
  const scores: number[] = (question.answers || []).map((a: any) => {
    const scoreRow = (a.answer_scores || []).find(
      (s: any) => s.contract_types?.slug === slug
    );
    return scoreRow?.score ?? 0;
  });
  if (scores.length === 0) return 0;
  if (question.type === 'multiple') {
    // Sum of all negative scores (worst case for multi-select)
    return scores.filter(v => v < 0).reduce((acc, v) => acc + v, 0);
  }
  return Math.min(...scores);
}

/**
 * Main calculation function. See `calculateResultsDebug` for the same
 * computation plus a full trace of intermediate values — useful when a
 * questionnaire has `show_debug = true` on the results page.
 */
export function calculateResults(
  questionnaireData: any,
  selectedAnswers: Record<string, string[]>,
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS
): ContractResult[] {
  return calculateResultsDebug(questionnaireData, selectedAnswers, settings).results;
}

/**
 * Same algorithm as `calculateResults` but also returns a detailed `trace`
 * of every intermediate step. Keeps the scoring logic in exactly one place.
 */
export function calculateResultsDebug(
  questionnaireData: any,
  selectedAnswers: Record<string, string[]>,
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS
): { results: ContractResult[]; trace: ResultsTrace } {
  const questions: any[] = questionnaireData?.questions ?? [];
  const contractTypes =
    questions.length === 0 ? [] : collectContractTypes(questionnaireData);

  const emptyTrace: ResultsTrace = {
    settings,
    contractTypes: contractTypes.map(c => ({ slug: c.slug, name: c.name })),
    questions: [],
    perContract: [],
  };

  if (contractTypes.length === 0) {
    return { results: [], trace: emptyTrace };
  }

  // --- Step 1: Raw score accumulation + per-question trace ---
  const rawScores: Record<string, number> = {};
  const explanationsBuckets: Record<string, { text: string; type: 'positive' | 'neutral' | 'negative' }[]> = {};

  contractTypes.forEach(ct => {
    rawScores[ct.slug] = 0;
    explanationsBuckets[ct.slug] = [];
  });

  const questionTrace: ResultsTrace['questions'] = [];

  questions.forEach(q => {
    const chosenIds = selectedAnswers[q.id] ?? [];
    const chosenAnswers = chosenIds
      .map((id: string) => (q.answers ?? []).find((a: any) => a.id === id))
      .filter(Boolean) as any[];

    // Per contract: contribution of THIS question
    const contribution: Record<string, number> = {};
    contractTypes.forEach(ct => { contribution[ct.slug] = 0; });

    chosenAnswers.forEach(answer => {
      (answer.answer_scores ?? []).forEach((s: any) => {
        const slug = s.contract_types?.slug;
        if (!slug || rawScores[slug] === undefined) return;

        const score = s.score ?? 0;
        rawScores[slug] += score;
        contribution[slug] += score;

        // Answer-level rationale, grouped by sentiment derived from the
        // sign of this answer's score for this contract type.
        const text = (s.explanation_text ?? '').trim();
        if (text && explanationsBuckets[slug] !== undefined) {
          const type: 'positive' | 'neutral' | 'negative' =
            score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
          explanationsBuckets[slug].push({ text, type });
        }
      });
    });

    questionTrace.push({
      id: q.id,
      text: q.text ?? '',
      type: q.type ?? 'single',
      chosenAnswers: chosenAnswers.map(a => ({ id: a.id, text: a.text ?? '' })),
      perContract: contractTypes.map(ct => ({
        slug: ct.slug,
        questionMin: questionMin(q, ct.slug),
        questionMax: questionMax(q, ct.slug),
        contribution: contribution[ct.slug] ?? 0,
      })),
    });
  });

  // --- Step 2: Normalise to 0–100% range ---
  const maxScores: Record<string, number> = {};
  const minScores: Record<string, number> = {};

  contractTypes.forEach(ct => {
    maxScores[ct.slug] = questions.reduce((acc, q) => acc + questionMax(q, ct.slug), 0);
    minScores[ct.slug] = questions.reduce((acc, q) => acc + questionMin(q, ct.slug), 0);
  });

  const basePercentagesRaw: Record<string, number> = {};
  const basePercentages: Record<string, number> = {};
  contractTypes.forEach(ct => {
    const { slug } = ct;
    const min = minScores[slug];
    const max = maxScores[slug];
    const raw = rawScores[slug];
    const range = max - min;
    const pct = range !== 0 ? ((raw - min) / range) * 100 : settings.neutral_when_empty_percentage;
    basePercentagesRaw[slug] = pct;
    // Floor so a contract never disappears; cap at 100%
    basePercentages[slug] = Math.max(settings.base_min_percentage, Math.min(100, pct));
  });

  // --- Step 3: Strengths-based fine-tuning (±adjustment_max_points) ---
  const finalPercentages: Record<string, number> = {};
  const perContractTrace: ResultsTrace['perContract'] = [];

  contractTypes.forEach(ct => {
    const { slug, name } = ct;
    const explanations = explanationsBuckets[slug];
    const totalExplanations = explanations.length;

    const positiveCount = explanations.filter(e => e.type === 'positive').length;
    const neutralCount  = explanations.filter(e => e.type === 'neutral').length;
    const negativeCount = explanations.filter(e => e.type === 'negative').length;

    let adjustment = 0;
    let ceiling = settings.optimal_ceiling;
    let finalPct: number;

    if (totalExplanations > 0) {
      const adjustmentFactor = (positiveCount - negativeCount) / totalExplanations;
      adjustment = adjustmentFactor * settings.adjustment_max_points;

      const hasNonOptimal = negativeCount > 0 || neutralCount > 0;
      ceiling = hasNonOptimal ? settings.non_optimal_ceiling : settings.optimal_ceiling;

      finalPct = Math.round(
        Math.max(settings.final_min_percentage, Math.min(ceiling, basePercentages[slug] + adjustment))
      );
    } else {
      finalPct = Math.round(basePercentages[slug]);
    }

    finalPercentages[slug] = finalPct;

    perContractTrace.push({
      slug,
      name,
      rawScore: rawScores[slug],
      minScore: minScores[slug],
      maxScore: maxScores[slug],
      basePercentageRaw: basePercentagesRaw[slug],
      basePercentage: basePercentages[slug],
      positiveCount,
      neutralCount,
      negativeCount,
      adjustment,
      ceilingApplied: ceiling,
      finalPercentage: finalPct,
    });
  });

  // --- Build output, sorted highest first ---
  const results: ContractResult[] = contractTypes
    .map(ct => ({
      slug: ct.slug,
      name: ct.name,
      subtitle: ct.subtitle ?? null,
      description: ct.description ?? null,
      percentage: finalPercentages[ct.slug] ?? 0,
      explanations: explanationsBuckets[ct.slug] ?? [],
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const trace: ResultsTrace = {
    settings,
    contractTypes: contractTypes.map(c => ({ slug: c.slug, name: c.name })),
    questions: questionTrace,
    perContract: perContractTrace,
  };

  return { results, trace };
}
