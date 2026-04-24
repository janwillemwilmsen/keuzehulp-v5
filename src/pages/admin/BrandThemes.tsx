import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/admin';

// Admin page for maintaining per-supplier brand colors. These values are
// stored on the `suppliers` table and injected as CSS variables on the
// wizard pages, so each brand renders with its own palette:
//   * Essent         → magenta family
//   * Energiedirect  → green family
//
// Fields per brand:
//   - Achtergrond       → --background of the wizard pages
//   - Titelkleur        → heading text color
//   - Primair           → CTA buttons, highlights, selection ring (--primary)
//   - Primaire tekst    → text on top of primair (--primary-foreground)

interface Supplier {
  id: string;
  name: string;
  slug: string;
  color_background: string | null;
  color_primary: string | null;
  color_primary_foreground: string | null;
  color_title: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const COLOR_FIELDS: {
  key: 'color_background' | 'color_title' | 'color_primary' | 'color_primary_foreground';
  label: string;
  help: string;
}[] = [
  {
    key: 'color_background',
    label: 'Achtergrond',
    help: 'Paginakleur achter de vragen- en resultaatkaarten.',
  },
  {
    key: 'color_title',
    label: 'Titelkleur',
    help: 'Kleur van koppen (bv. "Jouw Persoonlijke Advies").',
  },
  {
    key: 'color_primary',
    label: 'Primair (knoppen, accenten)',
    help: 'Gebruikt voor knoppen, geselecteerde opties en accenten.',
  },
  {
    key: 'color_primary_foreground',
    label: 'Tekst op primair',
    help: 'Tekstkleur bovenop de primaire kleur (meestal wit).',
  },
];

export default function BrandThemes() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    (async () => {
      try {
        const rows = await adminService.getSuppliers();
        setItems(rows || []);
      } catch (e: any) {
        setError(e?.message ?? 'Kon leveranciers niet laden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleColorChange = (id: string, field: keyof Supplier, value: string) => {
    setItems(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
    setStates(prev => ({ ...prev, [id]: 'idle' }));
  };

  const handleSave = async (s: Supplier) => {
    setStates(prev => ({ ...prev, [s.id]: 'saving' }));
    setErrors(prev => ({ ...prev, [s.id]: null }));
    try {
      await adminService.updateSupplier(s.id, {
        color_background: s.color_background ?? '#ffffff',
        color_title: s.color_title ?? '#111111',
        color_primary: s.color_primary ?? '#111111',
        color_primary_foreground: s.color_primary_foreground ?? '#ffffff',
      });
      setStates(prev => ({ ...prev, [s.id]: 'saved' }));
    } catch (e: any) {
      setStates(prev => ({ ...prev, [s.id]: 'error' }));
      setErrors(prev => ({ ...prev, [s.id]: e?.message ?? 'Opslaan mislukt.' }));
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Brandkleuren laden…</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 text-sm">
        <Link to="/admin" className="text-primary hover:underline">← Admin Dashboard</Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Brandkleuren</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Per leverancier ingesteld. De kleuren worden live op de keuzehulp
          toegepast als CSS-variabelen, dus iedere keuzehulp krijgt automatisch
          de juiste look &amp; feel.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {items.map(s => {
          const state = states[s.id] ?? 'idle';
          const errMsg = errors[s.id];
          return (
            <BrandCard
              key={s.id}
              supplier={s}
              onChange={(field, value) => handleColorChange(s.id, field, value)}
              onSave={() => handleSave(s)}
              state={state}
              errorMsg={errMsg}
            />
          );
        })}
      </div>
    </div>
  );
}

function BrandCard({
  supplier,
  onChange,
  onSave,
  state,
  errorMsg,
}: {
  supplier: Supplier;
  onChange: (field: keyof Supplier, value: string) => void;
  onSave: () => void;
  state: SaveState;
  errorMsg: string | null | undefined;
}) {
  return (
    <section className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <header className="px-6 py-3 border-b bg-muted/30 flex items-center gap-3">
        <span className="text-[10px] font-bold tracking-widest uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
          {supplier.slug}
        </span>
        <h2 className="font-semibold">{supplier.name}</h2>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Color inputs */}
        <div className="p-6 space-y-5">
          {COLOR_FIELDS.map(f => (
            <ColorField
              key={f.key}
              label={f.label}
              help={f.help}
              value={supplier[f.key] ?? ''}
              onChange={v => onChange(f.key, v)}
            />
          ))}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onSave}
              disabled={state === 'saving'}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {state === 'saving' ? 'Opslaan…' : 'Opslaan'}
            </button>
            {state === 'saved' && <span className="text-sm text-green-700">Opgeslagen.</span>}
            {state === 'error' && (
              <span className="text-sm text-destructive">{errorMsg ?? 'Opslaan mislukt.'}</span>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="border-t lg:border-t-0 lg:border-l bg-muted/10 p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Voorbeeld</p>
          <BrandPreview supplier={supplier} />
        </div>
      </div>
    </section>
  );
}

// Standalone color input: native swatch + hex text field, kept in sync.
function ColorField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // <input type="color"> only accepts a valid 7-char hex. If the stored
  // value is anything else (e.g. `oklch(...)` or empty) we show a neutral
  // fallback in the swatch so the picker still renders correctly.
  const swatchValue = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
      <div>
        <label className="block font-medium text-sm">{label}</label>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">{help}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatchValue}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-10 rounded-md border border-border bg-background cursor-pointer p-0"
          aria-label={`${label} kleurkiezer`}
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-32 p-2 border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="#ffffff"
        />
      </div>
    </div>
  );
}

// Mini version of the wizard card using the brand colors as CSS vars.
// Mirrors the style used in WizardEntry / WizardResults so editors see
// changes the way end users will.
function BrandPreview({ supplier }: { supplier: Supplier }) {
  const style = useMemo(() => {
    const vars: Record<string, string> = {};
    if (supplier.color_background) vars['--preview-bg'] = supplier.color_background;
    if (supplier.color_primary) vars['--preview-primary'] = supplier.color_primary;
    if (supplier.color_primary_foreground)
      vars['--preview-primary-fg'] = supplier.color_primary_foreground;
    if (supplier.color_title) vars['--preview-title'] = supplier.color_title;
    return vars as React.CSSProperties;
  }, [supplier]);

  return (
    <div style={style} className="rounded-xl">
      <div
        className="rounded-lg p-5 border shadow-sm"
        style={{ backgroundColor: 'var(--preview-bg)' }}
      >
        <h3
          className="text-xl font-extrabold mb-2"
          style={{ color: 'var(--preview-title)' }}
        >
          Jouw persoonlijke advies
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Zo ziet de keuzehulp er bij deze leverancier uit.
        </p>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-semibold shadow transition-colors"
          style={{
            backgroundColor: 'var(--preview-primary)',
            color: 'var(--preview-primary-fg)',
          }}
        >
          Start keuzehulp
        </button>
      </div>
    </div>
  );
}
