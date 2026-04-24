import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/admin';

// Admin page for maintaining the customer-facing "Uitleg" copy per contract type.
// The same text is shown in a modal on the wizard results page, so editors can
// tune explanations without touching code.
//
// The list order is driven by `contract_types.order_index`, which gives us the
// canonical sequence: Variabel | Vast 1 jaar | Vast 2 jaar | Vast 3 jaar |
// Dynamisch | Time of Use.

interface ContractType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order_index: number;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ContractTypesEditor() {
  const [items, setItems] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    (async () => {
      try {
        const rows = await adminService.getContractTypes();
        setItems(rows || []);
      } catch (e: any) {
        setError(e?.message ?? 'Kon contracttypes niet laden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFieldChange = (
    id: string,
    field: 'name' | 'description',
    value: string,
  ) => {
    setItems(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
    setStates(prev => ({ ...prev, [id]: 'idle' }));
  };

  const handleSave = async (ct: ContractType) => {
    setStates(prev => ({ ...prev, [ct.id]: 'saving' }));
    setErrors(prev => ({ ...prev, [ct.id]: null }));
    try {
      await adminService.updateContractType(ct.id, {
        name: ct.name,
        description: ct.description ?? '',
      });
      setStates(prev => ({ ...prev, [ct.id]: 'saved' }));
    } catch (e: any) {
      setStates(prev => ({ ...prev, [ct.id]: 'error' }));
      setErrors(prev => ({ ...prev, [ct.id]: e?.message ?? 'Opslaan mislukt.' }));
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Contracttypes laden…</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 text-sm">
        <Link to="/admin" className="text-primary hover:underline">← Admin Dashboard</Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Contracttypes</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Beheer de naam en de "Uitleg"-tekst die eindgebruikers in de modal op de
          resultatenpagina zien. Lege regels blijven behouden; gebruik ze gerust
          om bullets en alinea's visueel te scheiden.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {items.map(ct => {
          const state = states[ct.id] ?? 'idle';
          const errMsg = errors[ct.id];
          return (
            <section
              key={ct.id}
              className="bg-card border rounded-xl shadow-sm overflow-hidden"
            >
              <header className="px-6 py-3 border-b bg-muted/30 flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-widest uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  {ct.slug}
                </span>
                <h2 className="font-semibold">{ct.name}</h2>
              </header>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Naam</label>
                  <input
                    value={ct.name}
                    onChange={e => handleFieldChange(ct.id, 'name', e.target.value)}
                    className="w-full p-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Uitleg</label>
                  <textarea
                    rows={10}
                    value={ct.description ?? ''}
                    onChange={e => handleFieldChange(ct.id, 'description', e.target.value)}
                    className="w-full p-3 border rounded-md bg-background font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Korte uitleg voor de eindgebruiker…"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Witregels en bulletpoints (• of -) worden netjes getoond in de modal.
                  </p>
                </div>
              </div>

              <footer className="px-6 py-3 border-t bg-muted/20 flex items-center gap-3">
                <button
                  onClick={() => handleSave(ct)}
                  disabled={state === 'saving'}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {state === 'saving' ? 'Opslaan…' : 'Opslaan'}
                </button>
                {state === 'saved' && <span className="text-sm text-green-700">Opgeslagen.</span>}
                {state === 'error' && (
                  <span className="text-sm text-destructive">{errMsg ?? 'Opslaan mislukt.'}</span>
                )}
              </footer>
            </section>
          );
        })}
      </div>
    </div>
  );
}
