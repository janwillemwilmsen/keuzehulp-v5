import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';

export default function WizardStep() {
  const { id, questionIndex } = useParams();
  const navigate = useNavigate();
  const { supplierPrefix, setAnswer, answers, questionnaireData, loadingData } = useWizard();

  if (loadingData || !questionnaireData) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  const dbQuestions = (questionnaireData.questions ?? []).sort(
    (a: any, b: any) => a.order_index - b.order_index
  );

  const index = parseInt(questionIndex || '1', 10) - 1;
  const question = dbQuestions[index];

  if (!question) {
    navigate(`/keuzehulp/${id}/results`);
    return null;
  }

  const themeClass = supplierPrefix === 'essent' ? 'theme-essent' : 'theme-energiedirect';
  const isMultiple = question.type === 'multiple';
  const isOpen     = question.type === 'open';

  // Local state — open questions store a free-text string; others store answer IDs
  const [localAnswers, setLocalAnswers] = useState<string[]>(
    answers[question.id] || []
  );
  const [openText, setOpenText] = useState<string>(
    // open answers are stored as the literal text in the array
    (answers[question.id] || [])[0] ?? ''
  );

  const toggleAnswer = (answerId: string) => {
    if (isMultiple) {
      setLocalAnswers(prev =>
        prev.includes(answerId) ? prev.filter(a => a !== answerId) : [...prev, answerId]
      );
    } else {
      setLocalAnswers([answerId]);
    }
  };

  const handleNext = () => {
    if (isOpen) {
      setAnswer(question.id, openText.trim() ? [openText.trim()] : []);
    } else {
      setAnswer(question.id, localAnswers);
    }
    if (index + 1 < dbQuestions.length) {
      navigate(`/keuzehulp/${id}/q/${index + 2}`);
    } else {
      navigate(`/keuzehulp/${id}/results`);
    }
  };

  const canProceed = isOpen ? openText.trim().length > 0 : localAnswers.length > 0;

  const sortedOptions = (question.answers ?? []).sort(
    (a: any, b: any) => a.order_index - b.order_index
  );

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-muted/20 ${themeClass}`}>
      <div className="max-w-xl w-full rounded-2xl border bg-card p-8 shadow-sm">

        {/* Progress */}
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-6 font-medium">
          <span>Vraag {index + 1} van {dbQuestions.length}</span>
          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
            {isOpen ? 'Open vraag' : isMultiple ? 'Meerdere antwoorden mogelijk' : 'Kies één antwoord'}
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-8 text-foreground">{question.text}</h2>

        {/* ── Open question ── */}
        {isOpen && (
          <textarea
            value={openText}
            onChange={e => setOpenText(e.target.value)}
            placeholder="Typ hier je antwoord…"
            rows={4}
            className="w-full p-4 border-2 border-border/50 rounded-xl text-base text-foreground bg-background focus:border-primary focus:outline-none resize-none mb-8"
          />
        )}

        {/* ── Single / Multiple choice ── */}
        {!isOpen && (
          <div className="space-y-3 mb-8">
            {sortedOptions.map((opt: any) => {
              const isSelected = localAnswers.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleAnswer(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border/50 hover:border-primary/50 text-foreground'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Radio circle for single; checkbox square for multiple */}
                    <div className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center
                      ${isMultiple ? 'rounded-md' : 'rounded-full'}
                      ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}
                    >
                      {isSelected && (
                        isMultiple
                          ? <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                      )}
                    </div>
                    <span className="font-medium text-base">{opt.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-border/50">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground font-medium px-4 py-2"
          >
            Terug
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {index + 1 < dbQuestions.length ? 'Volgende' : 'Bekijk advies'}
          </button>
        </div>

      </div>
    </div>
  );
}
