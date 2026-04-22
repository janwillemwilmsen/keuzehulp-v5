import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/admin';
import { DEFAULT_SCORING_SETTINGS, ScoringSettings } from '@/services/calculator';

type FieldKey = keyof ScoringSettings;

interface FieldSpec {
  key: FieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  help: string;
}

const FIELDS: FieldSpec[] = [
  {
    key: 'base_min_percentage',
    label: 'Minimum basis-score',
    unit: '%',
    min: 0,
    max: 100,
    help: 'Na normalisering naar 0–100% wordt de basis-score nooit onder deze waarde gezet. Voorkomt dat een contract visueel verdwijnt omdat iedere vraag iets negatiefs scoorde.',
  },
  {
    key: 'final_min_percentage',
    label: 'Absolute ondergrens',
    unit: '%',
    min: 0,
    max: 100,
    help: 'Harde ondergrens die ná de fijnafstemming wordt toegepast. De gebruiker ziet nooit een lager percentage dan dit.',
  },
  {
    key: 'adjustment_max_points',
    label: 'Maximale fijnafstemming (±)',
    unit: 'pp',
    min: 0,
    max: 50,
    help: 'Maximum ± bijstelling in procentpunten, bepaald door de verhouding positieve vs. negatieve onderbouwingen: ((positief − negatief) / totaal) × deze waarde.',
  },
  {
    key: 'non_optimal_ceiling',
    label: 'Plafond bij gemengde match',
    unit: '%',
    min: 0,
    max: 100,
    help: 'Maximaal te tonen percentage wanneer er minstens één neutrale of negatieve onderbouwing is. Zorgt dat een "niet-perfect" contract nooit 100% kan tonen.',
  },
  {
    key: 'optimal_ceiling',
    label: 'Plafond bij volledige match',
    unit: '%',
    min: 0,
    max: 100,
    help: 'Maximaal percentage wanneer álle onderbouwingen positief zijn. Standaard 100%.',
  },
  {
    key: 'neutral_when_empty_percentage',
    label: 'Fallback bij leeg bereik',
    unit: '%',
    min: 0,
    max: 100,
    help: 'Gebruikt wanneer een contracttype geen scorebereik heeft (min = max, bv. alle antwoorden scoren 0). 50% betekent "geen mening".',
  },
];

export default function ScoringRules() {
  const [values, setValues] = useState<ScoringSettings>(DEFAULT_SCORING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const row = await adminService.getScoringSettings();
        if (row) {
          setValues({
            base_min_percentage: row.base_min_percentage,
            final_min_percentage: row.final_min_percentage,
            adjustment_max_points: row.adjustment_max_points,
            non_optimal_ceiling: row.non_optimal_ceiling,
            optimal_ceiling: row.optimal_ceiling,
            neutral_when_empty_percentage: row.neutral_when_empty_percentage,
          });
        }
      } catch (e: any) {
        setErrorMsg(e?.message ?? 'Kon rekenregels niet laden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (key: FieldKey, raw: string) => {
    const n = parseInt(raw, 10);
    setValues(prev => ({ ...prev, [key]: Number.isNaN(n) ? 0 : n }));
    setStatus('idle');
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    setErrorMsg(null);
    try {
      await adminService.updateScoringSettings(values);
      setStatus('saved');
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message ?? 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setValues(DEFAULT_SCORING_SETTINGS);
    setStatus('idle');
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Rekenregels laden…</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm">
        <Link to="/admin" className="text-primary hover:underline">← Admin Dashboard</Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Rekenregels</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Deze pagina beschrijft hoe de keuzehulp een advies berekent en laat je de parameters
          van de rekenmachine aanpassen. Wijzigingen zijn meteen van kracht voor alle keuzehulpen.
        </p>
      </div>

      {/* Algorithm description (read-only) */}
      <section className="mb-10 bg-card border rounded-xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b bg-muted/30">
          <h2 className="font-semibold">Hoe het werkt</h2>
        </header>
        <div className="px-6 py-5 space-y-5 text-sm leading-relaxed">
          <Step
            n={1}
            title="Ruwe scores verzamelen"
            body={
              <>
                Voor elk contracttype wordt de score van elk gekozen antwoord opgeteld, op basis
                van de waarden in de scorematrix (één cel per <em>antwoord × contracttype</em>).
              </>
            }
          />
          <Step
            n={2}
            title="Theoretisch bereik bepalen"
            body={
              <>
                Per vraag wordt de minimaal en maximaal haalbare score berekend:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Enkelvoudig</strong>: het beste respectievelijk slechtste antwoord.</li>
                  <li><strong>Meervoudig</strong>: de som van alle positieve respectievelijk negatieve antwoorden (alle tegelijk selecteerbaar).</li>
                </ul>
              </>
            }
          />
          <Step
            n={3}
            title="Normaliseren naar 0–100%"
            body={
              <>
                De ruwe score wordt geschaald naar een basispercentage met de formule{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  ((ruw − min) / (max − min)) × 100
                </code>. Het resultaat wordt geklemd tussen{' '}
                <Param value={values.base_min_percentage} unit="%" /> en 100%.
                Als het bereik nul is (min = max) wordt{' '}
                <Param value={values.neutral_when_empty_percentage} unit="%" /> gebruikt.
              </>
            }
          />
          <Step
            n={4}
            title="Fijnafstemming op basis van onderbouwingen"
            body={
              <>
                Voor elk gekozen antwoord met een rationale wordt een sentiment afgeleid uit het
                teken van de score (<span className="text-green-700">positief</span>,{' '}
                <span className="text-yellow-700">neutraal</span>,{' '}
                <span className="text-red-700">negatief</span>). De verhouding{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">(positief − negatief) / totaal</code>{' '}
                wordt vermenigvuldigd met <Param value={values.adjustment_max_points} unit="pp" />{' '}
                en bij het basispercentage opgeteld.
              </>
            }
          />
          <Step
            n={5}
            title="Plafond & vloer toepassen"
            body={
              <>
                Als er minstens één neutrale of negatieve onderbouwing is, wordt het resultaat
                geplafonneerd op <Param value={values.non_optimal_ceiling} unit="%" />; anders op{' '}
                <Param value={values.optimal_ceiling} unit="%" />. Als absolute ondergrens geldt{' '}
                <Param value={values.final_min_percentage} unit="%" />.
              </>
            }
          />
          <Step
            n={6}
            title="Sorteren en tonen"
            body={
              <>
                Contracttypes worden op aflopend eindpercentage gesorteerd. Het hoogste wordt
                als "Beste Match" gepresenteerd. Per contract worden de onderbouwingen gegroepeerd
                naar sentiment weergegeven.
              </>
            }
          />
        </div>
      </section>

      {/* Editable parameters */}
      <section className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold">Parameters</h2>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            type="button"
          >
            Terug naar standaardwaarden
          </button>
        </header>

        <div className="divide-y">
          {FIELDS.map(f => (
            <div key={f.key} className="px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
              <div>
                <label htmlFor={f.key} className="block font-medium">{f.label}</label>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">{f.help}</p>
              </div>
              <div className="flex items-center gap-2 md:justify-self-end">
                <input
                  id={f.key}
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={1}
                  value={values[f.key]}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className="w-24 p-2 border rounded-md bg-background text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground w-8">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <footer className="px-6 py-4 border-t bg-muted/20 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
          {status === 'saved' && (
            <span className="text-sm text-green-700">Opgeslagen.</span>
          )}
          {status === 'error' && (
            <span className="text-sm text-destructive">{errorMsg ?? 'Opslaan mislukt.'}</span>
          )}
        </footer>
      </section>

      {errorMsg && status !== 'error' && (
        <p className="mt-4 text-sm text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
        {n}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <div className="text-muted-foreground mt-1">{body}</div>
      </div>
    </div>
  );
}

function Param({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs font-bold">
      {value}{unit}
    </span>
  );
}
