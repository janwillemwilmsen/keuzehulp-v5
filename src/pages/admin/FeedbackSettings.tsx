import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { Link } from 'react-router-dom';

export default function FeedbackSettings() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getGlobalFeedbackQuestions();
      setQuestions(data || []);
    } catch (e) {
      console.error(e);
      alert('Error loading feedback questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (category: string) => {
    const text = prompt('Vraag tekst:');
    if (!text) return;
    try {
      const currentInCat = questions.filter(q => q.category === category);
      const newIndex = currentInCat.length > 0 ? Math.max(...currentInCat.map(q => q.order_index)) + 1 : 1;
      await adminService.addGlobalFeedbackQuestion(category, text, '1-5', true, newIndex);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Error adding question');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Vraag verwijderen?')) return;
    try {
      await adminService.deleteGlobalFeedbackQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
    } catch (e) {
      console.error(e);
      alert('Error deleting question');
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await adminService.updateGlobalFeedbackQuestion(id, { [field]: value });
      setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    } catch (e) {
      console.error(e);
      alert('Error updating question');
    }
  };

  if (loading && questions.length === 0) return <div className="p-8">Laden...</div>;

  const perQuestionQs = questions.filter(q => q.category === 'per_question').sort((a, b) => a.order_index - b.order_index);
  const resultsQs = questions.filter(q => q.category === 'results').sort((a, b) => a.order_index - b.order_index);

  const renderQuestionRow = (q: any) => (
    <div key={q.id} className="bg-card border rounded-xl p-4 mb-4 shadow-sm flex flex-col gap-4">
      <div className="flex gap-4 items-start">
        <div className="flex-1 space-y-3">
          <input
            value={q.text}
            onChange={(e) => handleUpdate(q.id, 'text', e.target.value)}
            className="w-full font-bold bg-transparent border-b border-transparent hover:border-primary/40 focus:border-primary focus:outline-none"
          />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Type:</span>
              <select
                value={q.rating_type}
                onChange={(e) => handleUpdate(q.id, 'rating_type', e.target.value)}
                className="bg-muted p-1 rounded border"
              >
                <option value="none">Geen (Alleen tekst)</option>
                <option value="1-5">Score 1-5</option>
                <option value="1-10">Score 1-10</option>
                <option value="yes_no">Ja / Nee</option>
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={q.has_open_field}
                onChange={(e) => handleUpdate(q.id, 'has_open_field', e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Met open toelichting veld?</span>
            </label>
          </div>
        </div>
        <button
          onClick={() => handleDelete(q.id)}
          className="text-destructive hover:bg-destructive/10 px-3 py-1 rounded-md text-sm shrink-0"
        >
          Verwijder
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link to="/admin" className="hover:text-foreground">← Terug naar overzicht</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">Feedback Instellingen</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold mb-2">Feedback Formulieren</h1>
          <p className="text-muted-foreground">Beheer de vragen die getoond worden als je feedback activeert in de keuzehulp.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold">Vraag Feedback (Algemeen)</h2>
             <button onClick={() => handleAddQuestion('per_question')} className="text-sm text-primary hover:underline">+ Vraag toevoegen</button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Getoond direct na een vraag in de wizard, indien ingeschakeld per vraag.
          </p>
          {perQuestionQs.length === 0 && <p className="text-sm italic text-muted-foreground">Geen vragen ingesteld.</p>}
          {perQuestionQs.map(renderQuestionRow)}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold">Resultaten Feedback</h2>
             <button onClick={() => handleAddQuestion('results')} className="text-sm text-primary hover:underline">+ Vraag toevoegen</button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Getoond onderaan de resultatenpagina, indien ingeschakeld op de keuzehulp.
          </p>
          {resultsQs.length === 0 && <p className="text-sm italic text-muted-foreground">Geen vragen ingesteld.</p>}
          {resultsQs.map(renderQuestionRow)}
        </div>
      </div>
    </div>
  );
}
