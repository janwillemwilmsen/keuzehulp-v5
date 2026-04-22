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
  percentage: number;
  explanations: {
    text: string;
    type: 'positive' | 'neutral' | 'negative'; // stored exactly as in DB
  }[];
}

/**
 * Collects all unique contract types from the loaded questionnaire data
 * (from the answer_scores → contract_types join). This is supplier-aware:
 * only contract types that actually appear in any answer_score row will
 * be included, which automatically reflects what the CMS has configured.
 */
export function collectContractTypes(questions: any[]): { slug: string; name: string; order_index: number }[] {
  const seen = new Map<string, { name: string; order_index: number }>();
  questions.forEach(q => {
    (q.answers || []).forEach((a: any) => {
      (a.answer_scores || []).forEach((s: any) => {
        const ct = s.contract_types;
        if (ct?.slug && !seen.has(ct.slug)) {
          seen.set(ct.slug, { name: ct.name ?? ct.slug, order_index: ct.order_index ?? 99 });
        }
      });
    });
  });
  return Array.from(seen.entries())
    .map(([slug, { name, order_index }]) => ({ slug, name, order_index }))
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
 * Main calculation function.
 *
 * @param questionnaireData - Full data structure from Supabase (getQuestionnaireFull)
 * @param selectedAnswers   - Map of questionId → array of selected answerIds
 * @returns                   Ranked array of ContractResult, highest match first
 */
export function calculateResults(
  questionnaireData: any,
  selectedAnswers: Record<string, string[]>
): ContractResult[] {
  const questions: any[] = questionnaireData?.questions ?? [];
  if (questions.length === 0) return [];

  // --- Derive the contract type universe from the data (supplier-aware) ---
  const contractTypes = collectContractTypes(questions);
  if (contractTypes.length === 0) return [];

  // --- Step 1: Raw score accumulation ---
  const rawScores: Record<string, number> = {};
  const explanationsBuckets: Record<string, { text: string; type: 'positive' | 'neutral' | 'negative' }[]> = {};

  contractTypes.forEach(ct => {
    rawScores[ct.slug] = 0;
    explanationsBuckets[ct.slug] = [];
  });

  questions.forEach(q => {
    const chosenIds = selectedAnswers[q.id] ?? [];

    // Per contract type: accumulate this question's score contribution
    const questionScorePerSlug: Record<string, number> = {};
    contractTypes.forEach(ct => { questionScorePerSlug[ct.slug] = 0; });

    chosenIds.forEach(answerId => {
      const answer = (q.answers ?? []).find((a: any) => a.id === answerId);
      if (!answer) return;

      (answer.answer_scores ?? []).forEach((s: any) => {
        const slug = s.contract_types?.slug;
        if (!slug || rawScores[slug] === undefined) return;
        rawScores[slug] += s.score ?? 0;
        if (questionScorePerSlug[slug] !== undefined) {
          questionScorePerSlug[slug] += s.score ?? 0;
        }
      });
    });

    // For each contract type, pick the right question-level explanation
    // based on whether this question's score contribution was positive, zero, or negative
    contractTypes.forEach(ct => {
      const qScore = questionScorePerSlug[ct.slug] ?? 0;
      let text = '';
      let type: 'positive' | 'neutral' | 'negative' = 'neutral';

      if (qScore > 0 && q.explanation_positive?.trim()) {
        text = q.explanation_positive.trim();
        type = 'positive';
      } else if (qScore < 0 && q.explanation_negative?.trim()) {
        text = q.explanation_negative.trim();
        type = 'negative';
      } else if (q.explanation_neutral?.trim()) {
        text = q.explanation_neutral.trim();
        type = 'neutral';
      }

      // Only push if there's actually a text set by the content manager
      if (text && explanationsBuckets[ct.slug] !== undefined) {
        explanationsBuckets[ct.slug].push({ text, type });
      }
    });
  });

  // --- Step 2: Normalise to 0–100% range ---
  const maxScores: Record<string, number> = {};
  const minScores: Record<string, number> = {};

  contractTypes.forEach(ct => {
    maxScores[ct.slug] = questions.reduce((acc, q) => acc + questionMax(q, ct.slug), 0);
    minScores[ct.slug] = questions.reduce((acc, q) => acc + questionMin(q, ct.slug), 0);
  });

  const basePercentages: Record<string, number> = {};
  contractTypes.forEach(ct => {
    const { slug } = ct;
    const min = minScores[slug];
    const max = maxScores[slug];
    const raw = rawScores[slug];
    const range = max - min;
    const pct = range !== 0 ? ((raw - min) / range) * 100 : 50;
    // Hard floor of 20% so a contract never disappears; cap at 100%
    basePercentages[slug] = Math.max(20, Math.min(100, pct));
  });

  // --- Step 3: Strengths-based fine-tuning (±5%) ---
  const finalPercentages: Record<string, number> = {};
  contractTypes.forEach(ct => {
    const { slug } = ct;
    const explanations = explanationsBuckets[slug];
    const totalExplanations = explanations.length;

    if (totalExplanations > 0) {
      const optimalCount = explanations.filter(e => e.type === 'positive').length;
      const negativeCount = explanations.filter(e => e.type === 'negative').length;
      const adjustmentFactor = (optimalCount - negativeCount) / totalExplanations;
      const adjustment = adjustmentFactor * 5; // max ± 5pp

      const hasNonOptimal = negativeCount > 0 || explanations.some(e => e.type === 'neutral');
      const ceiling = hasNonOptimal ? 95 : 100;
      finalPercentages[slug] = Math.round(
        Math.max(15, Math.min(ceiling, basePercentages[slug] + adjustment))
      );
    } else {
      finalPercentages[slug] = Math.round(basePercentages[slug]);
    }
  });

  // --- Build output, sorted highest first ---
  return contractTypes
    .map(ct => ({
      slug: ct.slug,
      name: ct.name,
      percentage: finalPercentages[ct.slug] ?? 0,
      explanations: explanationsBuckets[ct.slug] ?? [],
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
