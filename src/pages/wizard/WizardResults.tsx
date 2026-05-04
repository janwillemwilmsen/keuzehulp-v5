import { useWizard } from './WizardContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { calculateResultsDebug, ResultsTrace } from '@/services/calculator';
import { brandThemeStyle } from './brandTheme';
import FeedbackForm from './components/FeedbackForm';

export default function WizardResults() {
  useParams();
  const navigate = useNavigate();
  const { answers, feedbackAnswers, setFeedbackAnswer, questionnaireData, globalFeedbackQuestions, scoringSettings, loadingData, setResultsData } = useWizard();

  const themeStyle = brandThemeStyle(questionnaireData?.suppliers);
  const showDebug = !!questionnaireData?.show_debug;

  const { ranking, trace } = useMemo(() => {
    if (!questionnaireData) return { ranking: [], trace: null as ResultsTrace | null };
    const out = calculateResultsDebug(questionnaireData, answers, scoringSettings);
    return { ranking: out.results, trace: out.trace };
  }, [questionnaireData, answers, scoringSettings]);

  useEffect(() => {
    // Sync the final ranking to context so it can be pushed to the database session
    if (ranking && ranking.length > 0) {
      setResultsData(ranking.map(r => ({
        slug: r.slug,
        name: r.name,
        percentage: r.percentage
      })));
    }
  }, [ranking, setResultsData]);

  const winner = ranking[0];

  if (loadingData) {
    return (
      <div style={themeStyle} className="min-h-screen flex items-center justify-center bg-background">
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
    <div style={themeStyle} className="min-h-screen p-4 bg-background">
      <div className={`w-full mx-auto my-8 space-y-6 ${showDebug ? 'max-w-5xl' : 'max-w-2xl'}`}>

        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--brand-title, var(--primary))' }}>
            Jouw Persoonlijke Advies
          </h1>
          <p className="text-muted-foreground">
            Op basis van jouw antwoorden hebben we berekend welk contract het beste bij je past.
          </p>
        </div>

        {/* Results Feedback Stepper */}
        {questionnaireData.show_results_feedback && (
          <FeedbackForm
            title="Help ons de keuzehulp te verbeteren"
            questions={globalFeedbackQuestions.filter(q => q.category === 'results')}
            values={feedbackAnswers['results'] || {}}
            onChange={(feedbackQuestionId, field, value) => setFeedbackAnswer('results', feedbackQuestionId, field, value)}
            isStepper={true}
            className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm mb-8"
          />
        )}

        {/* Contract Cards */}
        {ranking.map((contract, index) => {
          const isTop = index === 0;
          const positives  = contract.explanations.filter(e => e.type === 'positive');
          const neutrals   = contract.explanations.filter(e => e.type === 'neutral');
          const negatives  = contract.explanations.filter(e => e.type === 'negative');

          // Title block — name + optional subtitle. Shared between the
          // top card's static header and the lower cards' <summary>.
          const titleBlock = (
            <div>
              {isTop && (
                <span className="inline-block text-xs font-bold text-primary tracking-widest uppercase mb-1 bg-primary/10 px-2 py-0.5 rounded">
                  Beste Match
                </span>
              )}
              <h2 className={`font-extrabold ${isTop ? 'text-2xl text-foreground' : 'text-xl text-muted-foreground'}`}>
                {contract.name}
              </h2>
              {contract.subtitle && (
                <p className={`mt-1 text-sm ${isTop ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                  {contract.subtitle}
                </p>
              )}
            </div>
          );

          // Percentage badge — sized differently for top vs lower cards.
          const percentageBadge = (
            <div
              className={`shrink-0 rounded-full flex items-center justify-center font-black ${
                isTop
                  ? 'w-20 h-20 text-3xl bg-primary text-primary-foreground shadow-inner'
                  : 'w-14 h-14 text-lg bg-secondary text-secondary-foreground'
              }`}
            >
              {contract.percentage}%
            </div>
          );

          // Body — description + nested "Waarom past dit bij mij?" disclosure.
          // Identical for both top and non-top cards.
          const hasBody =
            !!contract.description ||
            positives.length > 0 ||
            neutrals.length > 0 ||
            negatives.length > 0;

          const body = hasBody && (
            <div className="p-6 space-y-4 text-sm bg-white">
              {contract.description && (
                <p className="whitespace-pre-line leading-relaxed text-foreground">
                  {contract.description}
                </p>
              )}

              {(positives.length > 0 ||
                neutrals.length > 0 ||
                negatives.length > 0) && (
                <details
                  open={isTop}
                  className="group rounded-lg border border-border/60 bg-muted/20 open:bg-muted/30 transition-colors"
                >
                  <summary className="cursor-pointer select-none list-none px-4 py-2.5 flex items-center justify-between gap-3 font-semibold text-foreground hover:text-primary">
                    <span>Waarom past dit bij mij?</span>
                    <span
                      aria-hidden="true"
                      className="text-xs text-muted-foreground transition-transform group-open:rotate-180"
                    >
                      ▾
                    </span>
                  </summary>

                  <div className="px-4 pb-4 pt-1 space-y-4">
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
                </details>
              )}
            </div>
          );

          // Top card stays a plain block — it's already the user's primary
          // focus, so we don't want to hide its body behind a click.
          if (isTop) {
            return (
              <div
                key={contract.slug}
                className="rounded-2xl border-2 overflow-hidden shadow-sm transition-all border-primary shadow-primary/10"
              >
                <div className="p-6 flex justify-between items-center gap-4 bg-primary/5 border-b border-primary/15">
                  {titleBlock}
                  {percentageBadge}
                </div>
                {body}
              </div>
            );
          }

          // Lower-ranked cards collapse into a native <details> so the user
          // can drill into each one on demand. The header doubles as the
          // <summary>; clicking anywhere on it (including the "Uitleg" link)
          // toggles the card open/closed.
          return (
            <details
              key={contract.slug}
              className="group/card rounded-2xl border-2 overflow-hidden shadow-sm transition-all border-border/50 open:border-primary/40"
            >
              <summary className="cursor-pointer select-none list-none p-6 flex justify-between items-center gap-4 bg-muted/30 border-b border-transparent group-open/card:border-border/50 hover:bg-muted/50 group-open/card:bg-muted/40">
                {titleBlock}
                <div className="flex items-center gap-4 shrink-0">
                  {percentageBadge}
                  <span
                    aria-hidden="true"
                    className="text-sm font-medium text-primary"
                  >
                    <span className="group-open/card:hidden">Uitleg ▾</span>
                    <span className="hidden group-open/card:inline">Verbergen ▴</span>
                  </span>
                </div>
              </summary>
              {body}
            </details>
          );
        })}

        {/* CTA */}
        {winner && (
          <button className="w-full h-14 rounded-xl bg-primary text-primary-foreground text-lg font-bold shadow hover:bg-primary/90 transition-colors">
            Kies {winner.name}
          </button>
        )}

        {/* Debug Panel — only when show_debug is on for this questionnaire */}
        {showDebug && trace && <DebugPanel trace={trace} />}



      </div>
    </div>
  );
}

// ─── Debug Panel ──────────────────────────────────────────────────────────────
// Only rendered when a questionnaire has show_debug = true. Shows every
// intermediate value the scoring engine produced so editors can audit and
// tune the matrix without guessing.

function DebugPanel({ trace }: { trace: ResultsTrace }) {
  const contracts = trace.perContract;

  return (
    <section className="mt-10 rounded-2xl border-2 border-dashed border-primary/40 bg-background shadow-sm overflow-hidden">
      <header className="px-6 py-4 border-b bg-primary/5 flex items-center gap-3">
        <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded">
          Debug
        </span>
        <h2 className="font-bold">Rekenlogica</h2>
        <span className="text-xs text-muted-foreground">
          (alleen zichtbaar zolang "Debug-modus" aanstaat in de CMS)
        </span>
      </header>

      <div className="divide-y">

        {/* Settings used */}
        <div className="px-6 py-4">
          <h3 className="font-semibold text-sm mb-2">Gebruikte parameters</h3>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs font-mono">
            {Object.entries(trace.settings).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-dashed border-border/50 py-0.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Per-contract summary */}
        <div className="px-6 py-4 overflow-x-auto">
          <h3 className="font-semibold text-sm mb-2">Per contracttype</h3>
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-1 pr-3">Contract</th>
                <th className="py-1 px-3 text-right">Ruw</th>
                <th className="py-1 px-3 text-right">Min</th>
                <th className="py-1 px-3 text-right">Max</th>
                <th className="py-1 px-3 text-right" title="Ongeclampeerd">Basis %</th>
                <th className="py-1 px-3 text-right" title="Na min-floor en 100% cap">Basis (clamp)</th>
                <th className="py-1 px-3 text-right" title="+pos / ~neu / -neg">Sentiment</th>
                <th className="py-1 px-3 text-right">Aanpassing</th>
                <th className="py-1 px-3 text-right">Plafond</th>
                <th className="py-1 pl-3 text-right font-bold">Eind %</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.slug} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-1 pr-3 font-semibold">{c.name}</td>
                  <td className="py-1 px-3 text-right">{c.rawScore}</td>
                  <td className="py-1 px-3 text-right text-muted-foreground">{c.minScore}</td>
                  <td className="py-1 px-3 text-right text-muted-foreground">{c.maxScore}</td>
                  <td className="py-1 px-3 text-right">{c.basePercentageRaw.toFixed(1)}</td>
                  <td className="py-1 px-3 text-right">{c.basePercentage.toFixed(1)}</td>
                  <td className="py-1 px-3 text-right">
                    <span className="text-green-700">+{c.positiveCount}</span>{' '}
                    <span className="text-yellow-700">~{c.neutralCount}</span>{' '}
                    <span className="text-red-700">-{c.negativeCount}</span>
                  </td>
                  <td className={`py-1 px-3 text-right ${c.adjustment > 0 ? 'text-green-700' : c.adjustment < 0 ? 'text-red-700' : ''}`}>
                    {c.adjustment > 0 ? '+' : ''}{c.adjustment.toFixed(2)}pp
                  </td>
                  <td className="py-1 px-3 text-right text-muted-foreground">{c.ceilingApplied}</td>
                  <td className="py-1 pl-3 text-right font-bold">{c.finalPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Per-question breakdown */}
        <div className="px-6 py-4 overflow-x-auto">
          <h3 className="font-semibold text-sm mb-2">Per vraag</h3>

          {trace.questions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Geen vragen gevonden.</p>
          ) : (
            <div className="space-y-5">
              {trace.questions.map((q, idx) => (
                <div key={q.id} className="border rounded-md p-3 bg-muted/10">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xs font-mono text-muted-foreground">Q{idx + 1}</span>
                    <span className="font-semibold text-sm">{q.text || <em>(geen tekst)</em>}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {q.type}
                    </span>
                  </div>

                  <div className="text-xs mb-2">
                    <span className="text-muted-foreground">Gekozen: </span>
                    {q.chosenAnswers.length === 0 ? (
                      <em className="text-muted-foreground">niets</em>
                    ) : (
                      q.chosenAnswers.map(a => (
                        <span key={a.id} className="inline-block mr-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {a.text || '(leeg)'}
                        </span>
                      ))
                    )}
                  </div>

                  <table className="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-1 pr-3">Contract</th>
                        <th className="py-1 px-3 text-right" title="Laagst haalbare score voor deze vraag">Min</th>
                        <th className="py-1 px-3 text-right" title="Hoogst haalbare score voor deze vraag">Max</th>
                        <th className="py-1 pl-3 text-right font-bold">Bijdrage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.perContract.map(pc => {
                        const name = trace.contractTypes.find(c => c.slug === pc.slug)?.name ?? pc.slug;
                        return (
                          <tr key={pc.slug} className="border-b border-border/30">
                            <td className="py-0.5 pr-3">{name}</td>
                            <td className="py-0.5 px-3 text-right text-muted-foreground">{pc.questionMin}</td>
                            <td className="py-0.5 px-3 text-right text-muted-foreground">{pc.questionMax}</td>
                            <td className={`py-0.5 pl-3 text-right font-bold ${pc.contribution > 0 ? 'text-green-700' : pc.contribution < 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                              {pc.contribution > 0 ? '+' : ''}{pc.contribution}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
