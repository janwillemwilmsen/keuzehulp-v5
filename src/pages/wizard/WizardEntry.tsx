import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';

export default function WizardEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadQuestionnaire, supplierPrefix, questionnaireData, loadingData } = useWizard();
  
  useEffect(() => {
    // Determine the supplier styling dynamically if we can (for now fallback from id or just 'essent')
    const mockSupplier = id?.includes('direct') ? 'energiedirect' : 'essent';
    if (id) loadQuestionnaire(id, mockSupplier);
  }, [id, loadQuestionnaire]);

  const themeClass = supplierPrefix === 'essent' ? 'theme-essent' : 'theme-energiedirect';

  if (loadingData || !questionnaireData) {
     return <div className={`min-h-screen flex items-center justify-center ${themeClass}`}>Laden...</div>;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-background ${themeClass}`}>
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-sm text-center">
        <h1 className="text-3xl font-extrabold mb-4 text-foreground">
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
