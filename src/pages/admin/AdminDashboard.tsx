import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const qData = await adminService.getQuestionnaires();
      const sData = await adminService.getSuppliers();
      setQuestionnaires(qData || []);
      setSuppliers(sData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!suppliers.length) return alert('Geen leveranciers gevonden.');
    try {
      setIsCreating(true);
      // Create a default linked to the first supplier
      const newQ = await adminService.createQuestionnaire('Nieuwe Keuzehulp', suppliers[0].id);
      if (newQ) {
        navigate(`/admin/questionnaires/${newQ.id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error aanmaken questionnaire');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
           <p className="text-muted-foreground mt-2">Beheer je vragenlijsten en resultaten.</p>
        </div>
        <button 
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90"
        >
          {isCreating ? 'Laden...' : '+ Nieuwe Keuzehulp'}
        </button>
      </div>

      {loading ? (
        <p>Laden...</p>
      ) : questionnaires.length === 0 ? (
        <div className="text-center p-12 border bg-card rounded-xl shadow-sm text-card-foreground">
           Nog geen vragenlijsten. Klik op + Nieuwe Keuzehulp om te beginnen.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {questionnaires.map((q) => (
            <div key={q.id} className="rounded-xl border bg-card p-6 shadow-sm hover:border-primary/50 transition-colors">
               <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-xl line-clamp-1">{q.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${q.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                     {q.is_published ? 'Live' : 'Draft'}
                  </span>
               </div>
               <p className="text-sm text-muted-foreground mb-6">
                 Leverancier: {q.suppliers?.name || 'Onbekend'}
               </p>
               <div className="flex justify-between items-center">
                 <span className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</span>
                 <Link 
                   to={`/admin/questionnaires/${q.id}`} 
                   className="text-sm font-medium text-primary hover:underline"
                 >
                   Bewerken &rarr;
                 </Link>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
