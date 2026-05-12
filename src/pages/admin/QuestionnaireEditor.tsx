import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminService } from '@/services/admin';
import QuestionCard from './components/QuestionCard';

// Extracts ordered contract types from the per-questionnaire junction table.
// Order is driven by contract_types.order_index so the canonical order
// (Variabel | Vast 1 jaar | Vast 2 jaar | Vast 3 jaar | Dynamisch | Time of Use)
// is preserved everywhere without us having to hardcode it here.
function getQuestionnaireContractTypes(data: any): any[] {
  const qct = data?.questionnaire_contract_types ?? [];
  return qct
    .map((row: any) => row.contract_types)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.order_index ?? 99) - (b.order_index ?? 99));
}

export default function QuestionnaireEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allContractTypes, setAllContractTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const contractTypes = data ? getQuestionnaireContractTypes(data) : [];
  const enabledContractIds = new Set<string>(contractTypes.map((c: any) => c.id));

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (uid: string) => {
    try {
      setLoading(true);
      const [qData, suppliersData, ctData] = await Promise.all([
        adminService.getQuestionnaireFull(uid),
        adminService.getSuppliers(),
        adminService.getContractTypes(),
      ]);
      setData(qData);
      setSuppliers(suppliersData || []);
      setAllContractTypes(ctData || []);
    } catch (e) {
      console.error(e);
      alert('Error inladen data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMeta = async (field: string, value: string | boolean) => {
    if (!data) return;
    setData({ ...data, [field]: value });
    try {
      setSaving(true);
      await adminService.updateQuestionnaire(data.id, { [field]: value });
    } catch(e) { console.error(e) } finally { setSaving(false) }
  };

  // Toggle one contract type on/off for this questionnaire.
  // We optimistically update local state first, then persist.
  const handleToggleContractType = async (ct: any, enabled: boolean) => {
    if (!data) return;
    const current: any[] = data.questionnaire_contract_types ?? [];
    const next = enabled
      ? [...current.filter((r: any) => r.contract_types?.id !== ct.id), { contract_types: ct }]
      : current.filter((r: any) => r.contract_types?.id !== ct.id);
    setData({ ...data, questionnaire_contract_types: next });
    try {
      setSaving(true);
      await adminService.setQuestionnaireContractType(data.id, ct.id, enabled);
    } catch (e) {
      console.error(e);
      alert('Opslaan contracttype mislukt');
      await loadData(data.id);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    try {
      const added = await adminService.addQuestion(data.id, 'Nieuwe vraag');
      setData({ ...data, questions: [...data.questions, { ...added, answers: [] }] });
    } catch(e) { console.error(e) }
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      await adminService.deleteQuestion(qId);
      setData({ ...data, questions: data.questions.filter((q: any) => q.id !== qId) });
    } catch(e) { console.error(e) }
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    if (!data || !data.questions) return;
    
    const questions = [...data.questions].sort((a:any, b:any) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id.localeCompare(b.id));
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    
    // Ensure every question has a concrete, distinct order_index before swapping.
    // Legacy data may have null values which makes swapping a no-op.
    questions.forEach((q: any, i: number) => { q.order_index = i + 1; });

    const currentQ = questions[index];
    const targetQ = questions[targetIndex];
    
    // Swap their order_indices
    const tempOrder = currentQ.order_index;
    currentQ.order_index = targetQ.order_index;
    targetQ.order_index = tempOrder;
    
    // Update local state optimistically
    setData({ ...data, questions });
    
    // Persist to DB
    try {
      setSaving(true);
      await Promise.all([
        adminService.updateQuestion(currentQ.id, { order_index: currentQ.order_index }),
        adminService.updateQuestion(targetQ.id, { order_index: targetQ.order_index })
      ]);
    } catch(e) { 
      console.error(e);
      // Revert on error by reloading
      await loadData(data.id);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Laden...</div>;
  if (!data) return <div className="p-8">Niet gevonden.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link to="/admin" className="hover:text-foreground">← Terug naar overzicht</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">Editor</span>
        {saving && <span className="ml-4 text-primary">Opslaan...</span>}

        {/* Right-aligned actions */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href={`/keuzehulp/${data.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            ↗ Preview keuzehulp
          </a>
          <button
            onClick={async () => {
              if (window.confirm('Weet je zeker dat je deze keuzehulp wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
                try {
                  await adminService.deleteQuestionnaire(data.id);
                  navigate('/admin');
                } catch (e) {
                  console.error(e);
                  alert('Verwijderen mislukt');
                }
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive text-destructive text-xs font-semibold hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            Verwijderen
          </button>
        </div>
      </div>

      {/* Meta Editor */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-bold">Basisinstellingen</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titel</label>
            <input 
              value={data.title || ''} 
              onChange={e => handleUpdateMeta('title', e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Leverancier</label>
            <select 
              value={data.supplier_id || ''}
              onChange={e => handleUpdateMeta('supplier_id', e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="" disabled>Kies leverancier…</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Introductie Tekst</label>
          <textarea 
            rows={3}
            value={data.intro_text || ''} 
            onChange={e => handleUpdateMeta('intro_text', e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        {/* Contract types — which contracts are in scope for THIS questionnaire.
             Order is driven by contract_types.order_index, so the canonical
             sequence (Variabel | Vast 1 jaar | Vast 2 jaar | Vast 3 jaar |
             Dynamisch | Time of Use) is preserved automatically. */}
        <div className="pt-4 border-t">
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-medium">Contracttypes</label>
            <span className="text-xs text-muted-foreground">
              Kies welke contracten in de matrix en het advies verschijnen
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {allContractTypes
              .slice()
              .sort((a: any, b: any) => (a.order_index ?? 99) - (b.order_index ?? 99))
              .map((ct: any) => {
                const checked = enabledContractIds.has(ct.id);
                return (
                  <label
                    key={ct.id}
                    className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer select-none transition-colors ${
                      checked
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border hover:border-primary/40 bg-background'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => handleToggleContractType(ct, e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm leading-tight">
                      <span className="font-medium block">{ct.name}</span>
                      {ct.description && (
                        <span className="text-xs text-muted-foreground">{ct.description}</span>
                      )}
                    </span>
                  </label>
                );
              })}
          </div>
          {contractTypes.length === 0 && (
            <p className="text-xs text-destructive mt-2">
              Er is nog geen enkel contracttype aangevinkt — de scorematrix en het advies blijven leeg tot je er minstens één kiest.
            </p>
          )}
        </div>

        {/* Debug toggle — shows the scoring breakdown on the results page */}
        <label className="flex items-start gap-3 pt-4 border-t cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!data.show_debug}
            onChange={e => handleUpdateMeta('show_debug', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Debug-modus: toon rekenlogica op de resultatenpagina</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Laat voor elke vraag en elk contracttype de ruwe scores, min/max-bereik,
              basispercentage, fijnafstemming en eindpercentage zien. Alleen zichtbaar
              zolang deze optie aan staat — handig tijdens het ijken van de scorematrix.
            </span>
          </span>
        </label>
        
        <label className="flex items-start gap-3 pt-4 border-t cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!data.show_results_feedback}
            onChange={e => handleUpdateMeta('show_results_feedback', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Toon feedback formulier op de resultatenpagina</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Toont het 'Resultaten Feedback' formulier aan het einde van de keuzehulp.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center justify-between mt-12 mb-4">
         <h2 className="text-2xl font-bold">Vragen & Matrix</h2>
         <button onClick={handleAddQuestion} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md shadow-sm text-sm hover:bg-secondary/80">
            + Vraag toevoegen
         </button>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
         {data.questions?.sort((a:any, b:any) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id.localeCompare(b.id)).map((q: any, index: number) => (
           <QuestionCard 
              key={q.id} 
              question={q} 
              contractTypes={contractTypes} 
              onDelete={() => handleDeleteQuestion(q.id)}
              onUpdate={() => loadData(data.id)}
              onMove={(direction: 'up' | 'down') => handleMoveQuestion(index, direction)}
              isFirst={index === 0}
              isLast={index === (data.questions?.length || 0) - 1}
           />
         ))}
         {data.questions?.length === 0 && (
           <p className="text-center text-muted-foreground p-8 border border-dashed rounded-xl">
             Nog geen vragen in deze wizard.
           </p>
         )}
      </div>

    </div>
  );
}
