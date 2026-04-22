import { adminService } from '@/services/admin';

// Scoring matrix: each cell is just a score (integer).
// Explanation texts live at the question level (see QuestionCard), NOT per cell.

function ScoreCell({
  answerId,
  contractTypeId,
  initialScore,
}: {
  answerId: string;
  contractTypeId: string;
  initialScore: number;
}) {
  // Uncontrolled — we use defaultValue and save on blur.
  // Score is a single number so there is no stale-read risk.
  const save = async (value: number) => {
    try {
      await adminService.upsertAnswerScore(answerId, contractTypeId, value, null, null);
    } catch (e) {
      console.error('Score save failed', e);
    }
  };

  const colorClass =
    initialScore > 0 ? 'border-green-300 bg-green-50 text-green-800 font-bold' :
    initialScore < 0 ? 'border-red-300 bg-red-50 text-red-800 font-bold' :
    'border-border bg-muted/10 text-muted-foreground';

  return (
    <input
      type="number"
      defaultValue={initialScore}
      onBlur={e => {
        const val = parseInt(e.target.value, 10) || 0;
        save(val);
        // Update cell color live
        if (val > 0) {
          e.target.className = e.target.className.replace(/border-\w+-\d+ bg-\w+-\d+ text-\w+-\d+/, 'border-green-300 bg-green-50 text-green-800');
        } else if (val < 0) {
          e.target.className = e.target.className.replace(/border-\w+-\d+ bg-\w+-\d+ text-\w+-\d+/, 'border-red-300 bg-red-50 text-red-800');
        }
      }}
      className={`w-full p-1.5 border rounded text-center text-sm font-mono ${colorClass} focus:outline-none focus:ring-2 focus:ring-primary`}
      title="Score voor dit antwoord op dit contracttype"
    />
  );
}

export default function ScoringMatrix({ answers, contractTypes, onDeleteAnswer, onAnswerTextChange }: any) {
  return (
    <table className="w-full text-sm text-left">
      <thead className="text-xs uppercase bg-muted/50 border-b">
        <tr>
          <th className="px-4 py-3 min-w-[160px]">Antwoord</th>
          {contractTypes.map((ct: any) => (
            <th key={ct.id} className="px-3 py-3 min-w-[100px] border-l font-bold text-center">
              {ct.name}
            </th>
          ))}
          <th className="px-2 py-3 w-10 border-l" />
        </tr>
      </thead>
      <tbody className="divide-y">
        {[...answers].sort((a: any, b: any) => a.order_index - b.order_index).map((answer: any) => (
          <tr key={answer.id} className="hover:bg-muted/5 transition-colors">

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
                className="w-full font-medium bg-transparent border-b border-transparent hover:border-muted focus:border-primary focus:outline-none text-sm"
                placeholder="Antwoord tekst…"
              />
            </td>

            {/* One score cell per contract type */}
            {contractTypes.map((ct: any) => {
              const scoreRow = (answer.answer_scores ?? []).find(
                (s: any) => s.contract_type_id === ct.id
              );
              return (
                <td key={ct.id} className="px-3 py-3 border-l">
                  <ScoreCell
                    key={`${answer.id}-${ct.id}-${scoreRow?.id ?? 'new'}`}
                    answerId={answer.id}
                    contractTypeId={ct.id}
                    initialScore={scoreRow?.score ?? 0}
                  />
                </td>
              );
            })}

            {/* Delete */}
            <td className="px-2 py-3 border-l text-center">
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
