import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';
import { brandThemeStyle } from './brandTheme';

export default function WizardEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadQuestionnaire, questionnaireData, loadingData } = useWizard();

  useEffect(() => {
    if (id) loadQuestionnaire(id, null as any);
  }, [id, loadQuestionnaire]);

  // Once the questionnaire data is loaded, update the supplier slug from
  // the actual DB relation instead of guessing from the UUID.
  useEffect(() => {
    if (questionnaireData?.suppliers?.slug) {
      loadQuestionnaire(questionnaireData.id, questionnaireData.suppliers.slug);
    }
  }, [questionnaireData, loadQuestionnaire]);

  const themeStyle = brandThemeStyle(questionnaireData?.suppliers);

  if (loadingData || !questionnaireData) {
     return <div style={themeStyle} className="min-h-screen flex items-center justify-center bg-background">Laden...</div>;
  }

  return (
    <div style={themeStyle} className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-sm text-center">
        <h1 className="text-3xl font-extrabold mb-4" style={{ color: 'var(--brand-title, var(--foreground))' }}>
          {questionnaireData.title || 'Klaar voor persoonlijk advies?'}
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          {questionnaireData.intro_text || 'Beantwoord een paar simpele vragen en ontdek direct welk energiecontract het beste bij jou past.'}
        </p>
        
        <div className="space-y-4 text-left mb-8">
          {(questionnaireData.usps && questionnaireData.usps.length > 0) ? (
            questionnaireData.usps.map((usp: string, idx: number) => (
              <div key={idx} className="flex bg-muted/50 p-3 rounded-lg items-center">
                <span className="text-primary font-bold mr-3">✓</span> <span>{usp}</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex bg-muted/50 p-3 rounded-lg items-center">
                <span className="text-primary font-bold mr-3">✓</span> <span>Transparant advies</span>
              </div>
              <div className="flex bg-muted/50 p-3 rounded-lg items-center">
                <span className="text-primary font-bold mr-3">✓</span> <span>Snel en eenvoudig</span>
              </div>
              <div className="flex bg-muted/50 p-3 rounded-lg items-center">
                <span className="text-primary font-bold mr-3">✓</span> <span>Gebaseerd op jouw situatie</span>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={() => navigate(`/keuzehulp/${id}/q/1`)}
          className="w-full inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Start Keuzehulp
        </button>
      </div>
    </div>
  );
}
