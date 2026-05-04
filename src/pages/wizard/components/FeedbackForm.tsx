import { useState } from 'react';

interface FeedbackQuestion {
  id: string;
  category: 'per_question' | 'results';
  text: string;
  rating_type: 'none' | '1-5' | '1-10' | 'yes_no';
  has_open_field: boolean;
  order_index: number;
}

interface FeedbackFormProps {
  title?: string;
  questions: FeedbackQuestion[];
  values: Record<string, { rating?: any, text?: string }>;
  onChange: (questionId: string, field: 'rating' | 'text', value: any) => void;
  className?: string;
  isStepper?: boolean;
}

export default function FeedbackForm({ title, questions, values, onChange, isStepper = false, className = "mt-12 bg-card border rounded-2xl p-6 md:p-8 shadow-sm" }: FeedbackFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  if (questions.length === 0) return null;

  if (isStepper && completed) {
    return (
      <div className={className}>
        <div className="text-center py-4">
          <h3 className="text-2xl font-bold text-primary mb-2">Bedankt voor je feedback!</h3>
          <p className="text-muted-foreground">Hieronder vind je jouw persoonlijke resultaat.</p>
        </div>
      </div>
    );
  }

  const renderQuestion = (q: FeedbackQuestion) => (
    <div key={q.id} className="space-y-4">
      <label className="block font-semibold text-foreground text-lg">{q.text}</label>

      {q.rating_type === '1-5' && (
        <div>
          <div className="flex gap-2 justify-center md:justify-start">
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => onChange(q.id, 'rating', num)}
                className={`w-12 h-12 rounded-full font-bold transition-colors shrink-0 ${values[q.id]?.rating === num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-primary/20 text-foreground'
                  }`}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex justify-between w-[272px] mt-2 text-xs text-muted-foreground mx-auto md:mx-0 px-1">
            <span>Helemaal niet duidelijk</span>
            <span>Heel duidelijk</span>
          </div>
        </div>
      )}

      {q.rating_type === '1-10' && (
        <div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start max-w-[472px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => onChange(q.id, 'rating', num)}
                className={`w-10 h-10 rounded-full font-bold text-sm transition-colors shrink-0 ${values[q.id]?.rating === num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-primary/20 text-foreground'
                  }`}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex justify-between w-full max-w-[472px] mt-2 text-xs text-muted-foreground mx-auto md:mx-0 px-1">
            <span>Helemaal niet duidelijk</span>
            <span>Heel duidelijk</span>
          </div>
        </div>
      )}

      {q.rating_type === 'yes_no' && (
        <div className="flex gap-4 justify-center md:justify-start">
          <button
            type="button"
            onClick={() => onChange(q.id, 'rating', 'yes')}
            className={`px-8 py-2.5 rounded-full font-bold transition-colors ${values[q.id]?.rating === 'yes'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-primary/20 text-foreground'
              }`}
          >
            Ja
          </button>
          <button
            type="button"
            onClick={() => onChange(q.id, 'rating', 'no')}
            className={`px-8 py-2.5 rounded-full font-bold transition-colors ${values[q.id]?.rating === 'no'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-primary/20 text-foreground'
              }`}
          >
            Nee
          </button>
        </div>
      )}

      {q.has_open_field && (
        <textarea
          value={values[q.id]?.text || ''}
          onChange={e => onChange(q.id, 'text', e.target.value)}
          placeholder={q.rating_type === 'none' ? 'Typ hier je suggesties of opmerkingen...' : 'Kan je je antwoord toelichten? (Optioneel)'}
          rows={3}
          className="w-full p-3 border rounded-lg text-foreground bg-background focus:border-primary focus:outline-none resize-none mt-2"
        />
      )}
    </div>
  );

  return (
    <div className={className}>
      {title && <h3 className="text-xl font-bold mb-1 text-foreground">{title}</h3>}

      {isStepper ? (
        <div className="space-y-6">
          <div className="text-sm font-medium text-muted-foreground text-center mb-6">
            Feedbackvraag {currentStep + 1} van {questions.length}
          </div>

          {renderQuestion(questions[currentStep])}

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-border/50">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={currentStep === 0}
              className="text-muted-foreground hover:text-foreground font-medium px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Vorige
            </button>

            {currentStep === questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCompleted(true)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Afronden
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-secondary px-8 text-base font-medium text-secondary-foreground shadow transition-colors hover:bg-secondary/90"
              >
                Volgende
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {questions.map(q => renderQuestion(q))}
        </div>
      )}
    </div>
  );
}
