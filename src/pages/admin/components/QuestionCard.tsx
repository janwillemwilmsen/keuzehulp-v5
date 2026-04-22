import { useState } from 'react';
import { adminService } from '@/services/admin';
import ScoringMatrix from './ScoringMatrix';

const EXPLANATION_FIELDS = [
  {
    key: 'explanation_positive',
    label: '✅ Positief',
    placeholder: 'Uitleg wanneer dit contract goed past bij dit antwoord…',
    border: 'border-green-200',
    bg: 'bg-green-50/60',
    ring: 'focus:ring-green-400',
    text: 'text-green-700',
  },
  {
    key: 'explanation_neutral',
    label: '🟡 Neutraal',
    placeholder: 'Uitleg wanneer dit contract redelijk past…',
    border: 'border-yellow-200',
    bg: 'bg-yellow-50/60',
    ring: 'focus:ring-yellow-400',
    text: 'text-yellow-700',
  },
  {
    key: 'explanation_negative',
    label: '❌ Aandachtspunt',
    placeholder: 'Uitleg wanneer dit contract minder goed past…',
    border: 'border-red-200',
    bg: 'bg-red-50/60',
    ring: 'focus:ring-red-400',
    text: 'text-red-700',
  },
] as const;

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

  const handleExplanationSave = async (field: string, value: string) => {
    try {
      await adminService.updateQuestion(question.id, { [field]: value });
    } catch (e) { console.error('Error saving explanation', e); }
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

      {/* Question-level explanations — always visible except for open questions */}
      {!isOpen && (
        <div className="p-4 space-y-3 bg-muted/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Uitleg voor deze vraag (getoond op de resultatenpagina)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {EXPLANATION_FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <label className={`text-xs font-bold tracking-wide ${f.text}`}>{f.label}</label>
                <textarea
                  defaultValue={question[f.key] ?? ''}
                  onBlur={e => {
                    const val = e.target.value;
                    if (val !== (question[f.key] ?? '')) {
                      handleExplanationSave(f.key, val);
                    }
                  }}
                  placeholder={f.placeholder}
                  rows={3}
                  className={`w-full p-2 border ${f.border} ${f.bg} rounded text-xs resize-none focus:ring-1 ${f.ring} outline-none placeholder:opacity-40`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
