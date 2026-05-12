import { useState } from 'react';
import { adminService } from '@/services/admin';
import ScoringMatrix from './ScoringMatrix';

const TYPE_OPTIONS = [
  { value: 'single',   label: 'Enkelvoudig (1 antwoord)',         hint: 'Gebruiker kiest één optie' },
  { value: 'multiple', label: 'Meervoudig (meerdere antwoorden)', hint: 'Gebruiker kiest meerdere opties' },
  { value: 'open',     label: 'Open vraag',                       hint: 'Gebruiker typt een vrij antwoord (geen scorematrix)' },
] as const;

export default function QuestionCard({ question, contractTypes, onDelete, onUpdate, onMove, isFirst, isLast }: any) {
  const [loading, setLoading] = useState(false);
  const [qText, setQText] = useState(question.text);
  const [qType, setQType] = useState<string>(question.type ?? 'single');
  const [showFeedback, setShowFeedback] = useState(question.show_feedback === true);

  const handleQuestionTextSave = async () => {
    if (qText !== question.text) {
      try {
        await adminService.updateQuestion(question.id, { text: qText });
      } catch (e) { console.error('Error saving question text', e); }
    }
  };

  const handleTypeSave = async (newType: string) => {
    setQType(newType);
    try {
      await adminService.updateQuestion(question.id, { type: newType });
    } catch (e) { console.error('Error saving question type', e); }
  };

  const handleAddAnswer = async () => {
    try {
      setLoading(true);
      await adminService.addAnswer(question.id, 'Nieuw antwoord');
      onUpdate();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteAnswer = async (aId: string) => {
    try {
      setLoading(true);
      await adminService.deleteAnswer(aId);
      onUpdate();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleUpdateAnswer = async (aId: string, payload: Record<string, unknown>) => {
    try {
      await adminService.updateAnswer(aId, payload);
    } catch (e) { console.error(e); }
  };

  const handleMoveAnswer = async (answerIndex: number, direction: 'up' | 'down') => {
    const sorted = [...(question.answers || [])].sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id.localeCompare(b.id)
    );
    const targetIndex = direction === 'up' ? answerIndex - 1 : answerIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Normalize so every answer has a distinct order_index
    sorted.forEach((a: any, i: number) => { a.order_index = i + 1; });

    const currentA = sorted[answerIndex];
    const targetA = sorted[targetIndex];
    const tmp = currentA.order_index;
    currentA.order_index = targetA.order_index;
    targetA.order_index = tmp;

    try {
      await Promise.all([
        adminService.updateAnswer(currentA.id, { order_index: currentA.order_index }),
        adminService.updateAnswer(targetA.id, { order_index: targetA.order_index }),
      ]);
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const isOpen = qType === 'open';

  return (
    <div className="bg-card border rounded-xl shadow-sm mb-6 overflow-hidden" style={{ padding: '10px' }}>

      {/* Question Header */}
      <div className="bg-primary/5 p-4 border-b flex items-start gap-4">
        <div className="flex-1 space-y-3">
          {/* Question text */}
          <input
            value={qText}
            onChange={e => setQText(e.target.value)}
            onBlur={handleQuestionTextSave}
            className="w-full text-lg font-bold bg-transparent border-b border-transparent hover:border-primary/40 focus:border-primary focus:outline-none"
            placeholder="Vraagtekst…"
          />
          {/* Type selector */}
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleTypeSave(opt.value)}
                title={opt.hint}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  qType === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Actions Container */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onMove?.('up')}
            disabled={isFirst}
            className="text-muted-foreground hover:bg-muted p-1.5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Omhoog verplaatsen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <button
            onClick={() => onMove?.('down')}
            disabled={isLast}
            className="text-muted-foreground hover:bg-muted p-1.5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Omlaag verplaatsen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          
          <div className="w-px h-6 bg-border mx-1"></div>

          <button
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md text-sm font-medium"
          >
            Verwijderen
          </button>
        </div>
      </div>

      {/* Open question notice — no scoring matrix needed */}
      {isOpen ? (
        <div className="px-4 py-6 text-sm text-muted-foreground text-center italic border-b bg-muted/10">
          Open vraag — gebruikers typen een vrij antwoord. Geen scorematrix of vaste antwoordopties.
        </div>
      ) : (
        <>
          {/* Scoring Matrix */}
          <div className="overflow-x-auto border-b">
            <ScoringMatrix
              answers={question.answers || []}
              contractTypes={contractTypes}
              onDeleteAnswer={handleDeleteAnswer}
              onUpdateAnswer={handleUpdateAnswer}
              onMoveAnswer={handleMoveAnswer}
            />
          </div>
          {/* Add Answer */}
          <div className="px-4 py-3 bg-muted/10 border-b">
            <button
              onClick={handleAddAnswer}
              disabled={loading}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Antwoord toevoegen
            </button>
          </div>
        </>
      )}

      {/* Feedback Toggle */}
      <div className="px-4 py-3 bg-muted/5 border-t flex items-center justify-between">
        <label htmlFor={`feedback-${question.id}`} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
          <input
            id={`feedback-${question.id}`}
            type="checkbox"
            checked={showFeedback}
            onChange={async (e) => {
              const val = e.target.checked;
              setShowFeedback(val); // Optimistic UI update
              try {
                await adminService.updateQuestion(question.id, { show_feedback: val });
                // We no longer call onUpdate() here to prevent the full page "Laden..." refresh.
                // The database is updated silently in the background.
              } catch (err) {
                console.error(err);
                setShowFeedback(!val); // Revert on error
              }
            }}
            className="rounded border-border text-primary focus:ring-primary"
          />
          Toon algemene feedbackvraag na deze vraag
        </label>
      </div>

    </div>
  );
}
