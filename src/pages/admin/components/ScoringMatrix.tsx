import { useState } from 'react';
import { adminService } from '@/services/admin';

// ─── ScoreCell ────────────────────────────────────────────────────────────────
// One cell per (answer × contract type).
// Two inputs only: the score (integer) and a free-text rationale.
// The visual sentiment (positive / neutral / negative) is derived from the
// sign of the score at render time, so it cannot drift from what is saved.

type Sentiment = 'positive' | 'neutral' | 'negative';

function sentimentOf(score: number): Sentiment {
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

const SENTIMENT_STYLES: Record<Sentiment, { bg: string; border: string; ring: string }> = {
  positive: { bg: 'bg-green-50/70',  border: 'border-green-200',  ring: 'focus:ring-green-400' },
  neutral:  { bg: 'bg-yellow-50/60', border: 'border-yellow-200', ring: 'focus:ring-yellow-400' },
  negative: { bg: 'bg-red-50/70',    border: 'border-red-200',    ring: 'focus:ring-red-400' },
};

function ScoreCell({
  answerId,
  contractTypeId,
  initial,
}: {
  answerId: string;
  contractTypeId: string;
  initial: { score: number; expText: string };
}) {
  const [score, setScore]     = useState(initial.score);
  const [expText, setExpText] = useState(initial.expText);
  const [saving, setSaving]   = useState(false);

  const save = async (s: number, txt: string) => {
    setSaving(true);
    try {
      await adminService.upsertAnswerScore(answerId, contractTypeId, s, txt || null);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const scoreColor =
    score > 0 ? 'border-green-300 bg-green-50 text-green-800 font-bold' :
    score < 0 ? 'border-red-300 bg-red-50 text-red-800 font-bold' :
    'border-border bg-muted/10 text-muted-foreground';

  const style = SENTIMENT_STYLES[sentimentOf(score)];

  return (
    <div className={`space-y-1.5 relative ${saving ? 'opacity-80' : ''}`}>
      <input
        type="number"
        value={score}
        onChange={e => setScore(parseInt(e.target.value, 10) || 0)}
        onBlur={() => save(score, expText)}
        className={`w-16 p-1 border rounded text-center text-xs font-mono ${scoreColor} focus:outline-none focus:ring-1 focus:ring-primary`}
      />
      <textarea
        value={expText}
        onChange={e => setExpText(e.target.value)}
        onBlur={() => save(score, expText)}
        placeholder="Waarom past dit contract (niet) bij dit antwoord?"
        rows={3}
        className={`w-full p-1.5 border ${style.border} ${style.bg} rounded text-[11px] leading-tight resize-none focus:ring-1 ${style.ring} outline-none placeholder:opacity-40`}
      />
    </div>
  );
}

// ─── Main Matrix ──────────────────────────────────────────────────────────────

export default function ScoringMatrix({ answers, contractTypes, onDeleteAnswer, onUpdateAnswer }: any) {
  return (
    <table className="w-full text-sm text-left">
      <thead className="text-xs uppercase bg-muted/50 border-b">
        <tr>
          <th className="px-4 py-3 min-w-[140px]">Antwoord</th>
          {contractTypes.map((ct: any) => (
            <th key={ct.id} className="px-2 py-3 min-w-[160px] border-l font-bold text-center">
              {ct.name}
            </th>
          ))}
          <th className="px-2 py-3 w-10 border-l" />
        </tr>
      </thead>
      <tbody className="divide-y">
        {[...answers].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id.localeCompare(b.id)).map((answer: any) => (
          <tr key={answer.id} className="align-top hover:bg-muted/5 transition-colors">

            {/* Answer text + optional helper description */}
            <td className="px-4 py-3 space-y-1.5">
              <input
                key={`${answer.id}-text`}
                defaultValue={answer.text}
                onBlur={e => {
                  if (e.target.value !== answer.text) {
                    onUpdateAnswer(answer.id, { text: e.target.value });
                  }
                }}
                className="w-full font-semibold bg-transparent border-b border-transparent hover:border-muted focus:border-primary focus:outline-none text-sm"
                placeholder="Antwoord tekst…"
              />
              <textarea
                key={`${answer.id}-desc`}
                defaultValue={answer.description ?? ''}
                onBlur={e => {
                  const next = e.target.value;
                  if (next !== (answer.description ?? '')) {
                    onUpdateAnswer(answer.id, { description: next || null });
                  }
                }}
                rows={2}
                placeholder="Toelichting (optioneel) — getoond onder het antwoord in de wizard"
                className="w-full text-xs leading-snug text-muted-foreground bg-transparent border border-transparent hover:border-muted focus:border-primary focus:outline-none rounded p-1 resize-none placeholder:italic placeholder:opacity-60"
              />
            </td>

            {/* One cell per contract type */}
            {contractTypes.map((ct: any) => {
              const row = (answer.answer_scores ?? []).find(
                (s: any) => s.contract_type_id === ct.id
              );
              const initial = {
                score:   row?.score ?? 0,
                expText: row?.explanation_text ?? '',
              };
              return (
                <td key={ct.id} className="px-2 py-2 border-l">
                  <ScoreCell
                    key={`${answer.id}-${ct.id}-${row?.id ?? 'new'}`}
                    answerId={answer.id}
                    contractTypeId={ct.id}
                    initial={initial}
                  />
                </td>
              );
            })}

            {/* Delete */}
            <td className="px-2 py-3 border-l text-center align-top">
              <button
                onClick={() => onDeleteAnswer(answer.id)}
                className="text-xs text-destructive hover:underline"
              >
                Wis
              </button>
            </td>
          </tr>
        ))}
        {answers.length === 0 && (
          <tr>
            <td colSpan={contractTypes.length + 2} className="p-6 text-center text-muted-foreground text-xs">
              Nog geen antwoorden. Klik op "+ Antwoord toevoegen".
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
