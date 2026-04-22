import { useState } from 'react';
import { adminService } from '@/services/admin';

// ─── ScoreCell ────────────────────────────────────────────────────────────────
// One controlled component per (answer × contract type) matrix cell.
// Contains: score, explanation type, explanation text.
// All saved together in one upsert on blur so no field overwrites another.

type ExpType = 'positive' | 'neutral' | 'negative';

const TYPE_STYLES: Record<ExpType, { label: string; bg: string; border: string; text: string }> = {
  positive: { label: '✅', bg: 'bg-green-50/70',  border: 'border-green-200', text: 'text-green-700' },
  neutral:  { label: '🟡', bg: 'bg-yellow-50/70', border: 'border-yellow-200', text: 'text-yellow-700' },
  negative: { label: '❌', bg: 'bg-red-50/70',    border: 'border-red-200', text: 'text-red-700' },
};

function ScoreCell({
  answerId,
  contractTypeId,
  initial,
}: {
  answerId: string;
  contractTypeId: string;
  initial: { score: number; expType: ExpType; expText: string };
}) {
  const [score, setScore]     = useState(initial.score);
  const [expType, setExpType] = useState<ExpType>(initial.expType);
  const [expText, setExpText] = useState(initial.expText);
  const [saving, setSaving]   = useState(false);

  const save = async (s: number, t: ExpType, txt: string) => {
    setSaving(true);
    try {
      await adminService.upsertAnswerScore(answerId, contractTypeId, s, txt || null, t);
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

  const style = TYPE_STYLES[expType];

  return (
    <div className={`space-y-1.5 relative ${saving ? 'opacity-80' : ''}`}>
      {/* Score + type on one line */}
      <div className="flex gap-1">
        <input
          type="number"
          value={score}
          onChange={e => setScore(parseInt(e.target.value, 10) || 0)}
          onBlur={() => save(score, expType, expText)}
          className={`w-14 p-1 border rounded text-center text-xs font-mono ${scoreColor} focus:outline-none focus:ring-1 focus:ring-primary`}
        />
        <select
          value={expType}
          onChange={e => {
            const t = e.target.value as ExpType;
            setExpType(t);
            save(score, t, expText);
          }}
          className={`flex-1 p-1 border rounded text-[10px] font-semibold ${style.bg} ${style.border} ${style.text} focus:outline-none focus:ring-1 focus:ring-primary`}
        >
          <option value="positive">✅ Positief</option>
          <option value="neutral">🟡 Neutraal</option>
          <option value="negative">❌ Negatief</option>
        </select>
      </div>
      {/* Explanation text */}
      <textarea
        value={expText}
        onChange={e => setExpText(e.target.value)}
        onBlur={() => save(score, expType, expText)}
        placeholder="Uitleg…"
        rows={2}
        className={`w-full p-1 border ${style.border} ${style.bg} rounded text-[11px] leading-tight resize-none focus:ring-1 focus:ring-primary outline-none placeholder:opacity-30`}
      />
    </div>
  );
}

// ─── Main Matrix ──────────────────────────────────────────────────────────────

export default function ScoringMatrix({ answers, contractTypes, onDeleteAnswer, onAnswerTextChange }: any) {
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
        {[...answers].sort((a: any, b: any) => a.order_index - b.order_index).map((answer: any) => (
          <tr key={answer.id} className="align-top hover:bg-muted/5 transition-colors">

            {/* Answer text */}
            <td className="px-4 py-3">
              <input
                key={answer.id}
                defaultValue={answer.text}
                onBlur={e => {
                  if (e.target.value !== answer.text) {
                    onAnswerTextChange(answer.id, e.target.value);
                  }
                }}
                className="w-full font-semibold bg-transparent border-b border-transparent hover:border-muted focus:border-primary focus:outline-none text-sm"
                placeholder="Antwoord tekst…"
              />
            </td>

            {/* One cell per contract type */}
            {contractTypes.map((ct: any) => {
              const row = (answer.answer_scores ?? []).find(
                (s: any) => s.contract_type_id === ct.id
              );
              const initial = {
                score:   row?.score ?? 0,
                expType: (row?.explanation_type ?? 'neutral') as ExpType,
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
