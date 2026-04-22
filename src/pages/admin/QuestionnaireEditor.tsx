import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminService } from '@/services/admin';
import QuestionCard from './components/QuestionCard';

// Extracts ordered contract types from the supplier's junction table
function getSupplierContractTypes(data: any): any[] {
  const sct = data?.suppliers?.supplier_contract_types ?? [];
  return sct
    .map((row: any) => row.contract_types)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.order_index ?? 99) - (b.order_index ?? 99));
}

export default function QuestionnaireEditor() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Derive supplier contract types from embedded join data (supplier-aware, no separate fetch)
  const contractTypes = data ? getSupplierContractTypes(data) : [];

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (uid: string) => {
    try {
      setLoading(true);
      const qData = await adminService.getQuestionnaireFull(uid);
      setData(qData);
    } catch (e) {
      console.error(e);
      alert('Error inladen data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMeta = async (field: string, value: string) => {
    if (!data) return;
    setData({ ...data, [field]: value }); // optimistic
    // "Save is directly live" - directly API
    try {
      setSaving(true);
      await adminService.updateQuestionnaire(data.id, { [field]: value });
    } catch(e) { console.error(e) } finally { setSaving(false) }
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

  if (loading) return <div className="p-8">Laden...</div>;
  if (!data) return <div className="p-8">Niet gevonden.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
        <Link to="/admin" className="hover:text-foreground">← Terug naar overzicht</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Editor</span>
        {saving && <span className="ml-auto text-primary">Opslaan...</span>}
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
               {data.suppliers && (
                 <option value={data.supplier_id}>{data.suppliers.name}</option>
               )}
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
      </div>

      <div className="flex items-center justify-between mt-12 mb-4">
         <h2 className="text-2xl font-bold">Vragen & Matrix</h2>
         <button onClick={handleAddQuestion} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md shadow-sm text-sm hover:bg-secondary/80">
            + Vraag toevoegen
         </button>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
         {data.questions?.sort((a:any, b:any) => a.order_index - b.order_index).map((q: any) => (
           <QuestionCard 
              key={q.id} 
              question={q} 
              contractTypes={contractTypes} 
              onDelete={() => handleDeleteQuestion(q.id)}
              onUpdate={() => loadData(data.id)}
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
