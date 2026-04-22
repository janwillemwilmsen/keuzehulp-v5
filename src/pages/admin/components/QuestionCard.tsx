import { useState } from 'react';
import { adminService } from '@/services/admin';
import ScoringMatrix from './ScoringMatrix';

const TYPE_OPTIONS = [
  { value: 'single',   label: 'Enkelvoudig (1 antwoord)',         hint: 'Gebruiker kiest één optie' },
  { value: 'multiple', label: 'Meervoudig (meerdere antwoorden)', hint: 'Gebruiker kiest meerdere opties' },
  { value: 'open',     label: 'Open vraag',                       hint: 'Gebruiker typt een vrij antwoord (geen scorematrix)' },
] as const;

export default function QuestionCard({ question, contractTypes, onDelete, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  const [qText, setQText] = useState(question.text);
  const [qType, setQType] = useState<string>(question.type ?? 'single');

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

  const handleAnswerTextChange = async (aId: string, val: string) => {
    try {
      await adminService.updateAnswer(aId, { text: val });
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
        <button
          onClick={onDelete}
          className="text-destructive hover:bg-destructive/10 px-3 py-1 rounded-md text-sm font-medium shrink-0"
        >
          Verwijderen
        </button>
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
              onAnswerTextChange={handleAnswerTextChange}
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

    </div>
  );
}
