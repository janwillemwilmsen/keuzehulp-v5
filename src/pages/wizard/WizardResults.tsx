import { useWizard } from './WizardContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { calculateResults } from '@/services/calculator';

export default function WizardResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { supplierPrefix, answers, questionnaireData, loadingData } = useWizard();
  
  const themeClass = supplierPrefix === 'essent' ? 'theme-essent' : 'theme-energiedirect';

  const ranking = useMemo(() => {
    if (!questionnaireData) return [];
    return calculateResults(questionnaireData, answers);
  }, [questionnaireData, answers]);

  const winner = ranking[0];

  if (loadingData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClass}`}>
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Advies berekenen...</p>
        </div>
      </div>
    );
  }

  if (!winner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        <h2 className="text-xl font-bold">Geen resultaten gevonden</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Het lijkt erop dat er nog geen scores zijn ingevuld in de scorematrix. Vraag de beheerder om de wizard in te stellen.
        </p>
        <button className="text-primary hover:underline font-medium" onClick={() => navigate(-1)}>
          ← Ga terug
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 bg-muted/20 ${themeClass}`}>
      <div className="max-w-2xl w-full mx-auto my-8 space-y-6">

        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <h1 className="text-3xl font-extrabold text-primary mb-2">Jouw Persoonlijke Advies</h1>
          <p className="text-muted-foreground">
            Op basis van jouw antwoorden hebben we berekend welk contract het beste bij je past.
          </p>
        </div>

        {/* Contract Cards */}
        {ranking.map((contract, index) => {
          const isTop = index === 0;
          const positives  = contract.explanations.filter(e => e.type === 'positive');
          const neutrals   = contract.explanations.filter(e => e.type === 'neutral');
          const negatives  = contract.explanations.filter(e => e.type === 'negative');

          return (
            <div
              key={contract.slug}
              className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
                isTop
                  ? 'border-primary shadow-primary/10'
                  : 'border-border/50'
              }`}
            >
              {/* Card Header */}
              <div className={`p-6 flex justify-between items-center gap-4 ${isTop ? 'bg-primary/5 border-b border-primary/15' : 'bg-muted/30 border-b border-border/50'}`}>
                <div>
                  {isTop && (
                    <span className="inline-block text-xs font-bold text-primary tracking-widest uppercase mb-1 bg-primary/10 px-2 py-0.5 rounded">
                      Beste Match
                    </span>
                  )}
                  <h2 className={`font-extrabold ${isTop ? 'text-2xl text-foreground' : 'text-xl text-muted-foreground'}`}>
                    {contract.name}
                  </h2>
                </div>
                {/* Percentage Badge */}
                <div
                  className={`shrink-0 rounded-full flex items-center justify-center font-black ${
                    isTop
                      ? 'w-20 h-20 text-3xl bg-primary text-primary-foreground shadow-inner'
                      : 'w-14 h-14 text-lg bg-secondary text-secondary-foreground'
                  }`}
                >
                  {contract.percentage}%
                </div>
              </div>

              {/* Explanations — only shown if there are any */}
              {(positives.length > 0 || neutrals.length > 0 || negatives.length > 0) && (
                <div className="p-6 space-y-4 text-sm">

                  {positives.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">✅ Goed passend</h3>
                      <ul className="space-y-1.5">
                        {positives.map((e, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5 shrink-0">●</span>
                            <span className="text-foreground">{e.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {neutrals.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">🟡 Redelijk passend</h3>
                      <ul className="space-y-1.5">
                        {neutrals.map((e, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-400 mt-0.5 shrink-0">●</span>
                            <span className="text-foreground">{e.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {negatives.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">❌ Houd hier rekening mee</h3>
                      <ul className="space-y-1.5">
                        {negatives.map((e, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5 shrink-0">■</span>
                            <span className="text-foreground">{e.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}

        {/* CTA */}
        {winner && (
          <button className="w-full h-14 rounded-xl bg-primary text-primary-foreground text-lg font-bold shadow hover:bg-primary/90 transition-colors">
            Kies {winner.name}
          </button>
        )}

      </div>
    </div>
  );
}
