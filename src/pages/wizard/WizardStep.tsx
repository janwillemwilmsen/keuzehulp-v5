import { useParams, useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';
import { brandThemeStyle } from './brandTheme';
import FeedbackForm from './components/FeedbackForm';

export default function WizardStep() {
  const { id, questionIndex } = useParams();
  const navigate = useNavigate();
  const { setAnswer, answers, feedbackAnswers, setFeedbackAnswer, questionnaireData, globalFeedbackQuestions, loadingData } = useWizard();

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

  const themeStyle = brandThemeStyle(questionnaireData.suppliers);
  const isMultiple = question.type === 'multiple';
  const isOpen = question.type === 'open';

  // Read straight from the wizard context. The component is reused across
  // question routes (only the URL param changes), so any local state would
  // get out of sync with the URL and silently drop selections when the
  // user navigates back. Treating context as the single source of truth
  // keeps the UI honest without an extra effect-based sync.
  const currentAnswers: string[] = answers[question.id] ?? [];
  const openText: string = isOpen ? (currentAnswers[0] ?? '') : '';

  const toggleAnswer = (answerId: string) => {
    if (isMultiple) {
      const next = currentAnswers.includes(answerId)
        ? currentAnswers.filter(a => a !== answerId)
        : [...currentAnswers, answerId];
      setAnswer(question.id, next);
    } else {
      setAnswer(question.id, [answerId]);
    }
  };

  const handleOpenTextChange = (value: string) => {
    setAnswer(question.id, value.trim() ? [value] : []);
  };

  const handleNext = () => {
    if (index + 1 < dbQuestions.length) {
      navigate(`/keuzehulp/${id}/q/${index + 2}`);
    } else {
      navigate(`/keuzehulp/${id}/results`);
    }
  };

  const canProceed = isOpen
    ? openText.trim().length > 0
    : currentAnswers.length > 0;

  const sortedOptions = (question.answers ?? []).sort(
    (a: any, b: any) => a.order_index - b.order_index
  );

  return (
    <div style={themeStyle} className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-xl w-full rounded-2xl border bg-card p-8 shadow-sm">

        {/* Progress */}
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-6 font-medium">
          <span>Vraag {index + 1} van {dbQuestions.length}</span>

        </div>

        <h2 className="text-2xl font-bold" style={{ color: 'var(--brand-title, var(--foreground))' }}>
          {question.text}
        </h2>
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-6 font-medium">
          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
            {isOpen ? 'Open vraag' : isMultiple ? 'Meerdere antwoorden mogelijk' : ''}
          </span>
        </div>

        {/* ── Open question ── */}
        {isOpen && (
          <textarea
            value={openText}
            onChange={e => handleOpenTextChange(e.target.value)}
            placeholder="Typ hier je antwoord…"
            rows={4}
            className="w-full p-4 border-2 border-border/50 rounded-xl text-base text-foreground bg-background focus:border-primary focus:outline-none resize-none mb-8"
          />
        )}

        {/* ── Single / Multiple choice ── */}
        {!isOpen && (
          <div className="space-y-3 mb-8">
            {sortedOptions.map((opt: any) => {
              const isSelected = currentAnswers.includes(opt.id);
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
                  <div className="flex items-start gap-4">
                    {/* Radio circle for single; checkbox square for multiple */}
                    <div className={`shrink-0 mt-0.5 w-5 h-5 border-2 flex items-center justify-center
                      ${isMultiple ? 'rounded-md' : 'rounded-full'}
                      ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}
                    >
                      {isSelected && (
                        isMultiple
                          ? <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          : <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-base block">{opt.text}</span>
                      {opt.description && (
                        <span className={`block text-sm mt-1 leading-snug ${isSelected ? 'text-primary/80' : 'text-muted-foreground'}`}>
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {question.show_feedback && (
          <FeedbackForm
            title="Help ons de keuzehulp te verbeteren"
            questions={globalFeedbackQuestions.filter(q => q.category === 'per_question')}
            values={feedbackAnswers[question.id] || {}}
            onChange={(feedbackQuestionId, field, value) => setFeedbackAnswer(question.id, feedbackQuestionId, field, value)}
            className="pt-6 mt-6 border-t border-border/50"
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-border/50">
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
