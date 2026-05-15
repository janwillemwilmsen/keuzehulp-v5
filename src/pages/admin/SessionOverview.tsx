import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { Link } from 'react-router-dom';

export default function SessionOverview() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await adminService.getUserSessions();
      setSessions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze sessie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    setDeletingId(id);
    try {
      await adminService.deleteUserSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e) {
      console.error('Delete failed', e);
      alert('Verwijderen mislukt. Probeer het opnieuw.');
    } finally {
      setDeletingId(null);
    }
  };

  const exportToCSV = () => {
    if (!sessions.length) return;

    // Pass 1: Gather all unique contract types, question texts, and feedback question texts
    const contractTypeNames = new Set<string>();
    const questionTexts = new Set<string>();
    const feedbackQuestions = new Set<string>();

    sessions.forEach(session => {
      const data = session.session_data || {};
      
      if (data.results) {
        data.results.forEach((r: any) => contractTypeNames.add(r.name));
      }
      
      if (data.answers) {
        Object.values(data.answers).forEach((ans: any) => {
          if (ans.questionText) questionTexts.add(ans.questionText);
        });
      }
      
      if (data.feedback) {
        Object.entries(data.feedback).forEach(([wQId, fbGroup]: [string, any]) => {
          let context = 'Resultaten';
          if (wQId !== 'results' && data.answers?.[wQId]?.questionText) {
            context = data.answers[wQId].questionText;
          } else if (wQId !== 'results') {
            context = `Vraag (${wQId})`;
          }

          Object.values(fbGroup).forEach((fb: any) => {
            if (fb.questionText) {
              feedbackQuestions.add(`${context} - ${fb.questionText}`);
            }
          });
        });
      }
    });

    const contractTypesArr = Array.from(contractTypeNames);
    const questionsArr = Array.from(questionTexts);
    const feedbackArr = Array.from(feedbackQuestions);

    const headers = [
      'ID', 
      'Datum', 
      'Keuzehulp', 
      'Leverancier', 
      'Status', 
      'Aanbevolen Contract', 
      'Aanbevolen Score (%)',
      ...contractTypesArr.map(ct => `Score: ${ct} (%)`),
      ...questionsArr.map(q => `Antwoord: ${q}`),
      ...feedbackArr.map(q => `Feedback Score: ${q}`),
      ...feedbackArr.map(q => `Feedback Tekst: ${q}`)
    ];

    const rows = sessions.map(session => {
      const data = session.session_data || {};
      const isCompleted = data.results && data.results.length > 0;
      const winner = isCompleted ? data.results[0] : null;

      const resultsMap = new Map();
      if (data.results) {
        data.results.forEach((r: any) => resultsMap.set(r.name, r.percentage));
      }

      const answersMap = new Map();
      if (data.answers) {
        Object.values(data.answers).forEach((ans: any) => {
          const selected = ans.selectedAnswers?.map((sa: any) => sa.text).join('; ') || '';
          answersMap.set(ans.questionText, selected);
        });
      }

      const feedbackScoreMap = new Map();
      const feedbackTextMap = new Map();
      
      if (data.feedback) {
        Object.entries(data.feedback).forEach(([wQId, fbGroup]: [string, any]) => {
          let context = 'Resultaten';
          if (wQId !== 'results' && data.answers?.[wQId]?.questionText) {
            context = data.answers[wQId].questionText;
          } else if (wQId !== 'results') {
            context = `Vraag (${wQId})`;
          }

          Object.values(fbGroup).forEach((fb: any) => {
            const text = fb.questionText;
            if (!text) return;
            
            const columnKey = `${context} - ${text}`;
            
            if (fb.rating !== undefined && fb.rating !== null && fb.rating !== '') {
              const current = feedbackScoreMap.get(columnKey);
              feedbackScoreMap.set(columnKey, current ? `${current} | ${fb.rating}` : fb.rating);
            }
            
            if (fb.text) {
              const current = feedbackTextMap.get(columnKey);
              feedbackTextMap.set(columnKey, current ? `${current} | ${fb.text}` : fb.text);
            }
          });
        });
      }

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        // We now use semicolon as delimiter, so we escape if the string contains a semicolon, quote, or newline
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rowData = [
        session.id,
        new Date(session.updated_at).toISOString(),
        session.questionnaires?.title || '',
        session.supplier_slug || '',
        isCompleted ? 'Afgerond' : 'Bezig',
        winner ? winner.name : '',
        winner ? winner.percentage : '',
        ...contractTypesArr.map(ct => resultsMap.get(ct) || ''),
        ...questionsArr.map(q => answersMap.get(q) || ''),
        ...feedbackArr.map(q => feedbackScoreMap.get(q) || ''),
        ...feedbackArr.map(q => feedbackTextMap.get(q) || '')
      ];

      return rowData.map(escapeCSV).join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sessies_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link to="/admin" className="hover:text-foreground">← Terug naar overzicht</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">Sessies & Resultaten</span>
      </div>

      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessies & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Bekijk live inzendingen en feedback van bezoekers die de keuzehulp gebruiken.
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={sessions.length === 0}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exporteer (CSV)
        </button>
      </div>

      {loading ? (
        <p>Laden...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center p-12 border bg-card rounded-xl shadow-sm text-card-foreground">
          Nog geen sessies opgeslagen.
        </div>
      ) : (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Datum</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Keuzehulp</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Leverancier</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Status / Resultaat</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((session) => {
                  const data = session.session_data || {};
                  const isExpanded = expandedId === session.id;
                  
                  const answerCount = Object.keys(data.answers || {}).length;
                  const winner = data.results && data.results.length > 0 ? data.results[0] : null;

                  return (
                    <React.Fragment key={session.id}>
                      <tr className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(session.updated_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {session.questionnaires?.title || 'Onbekend'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="capitalize px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                            {session.supplier_slug}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {winner ? (
                            <span className="font-semibold text-green-600">
                              🏆 {winner.name} ({winner.percentage}%)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              Bezig ({answerCount} antwoorden)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => toggleExpand(session.id)}
                              className="text-primary hover:underline font-medium text-sm"
                            >
                              {isExpanded ? 'Inklappen' : 'Bekijk details'}
                            </button>
                            <button
                              onClick={() => handleDelete(session.id)}
                              disabled={deletingId === session.id}
                              className="text-destructive hover:text-destructive/80 hover:underline font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === session.id ? 'Bezig…' : 'Verwijder'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-muted/10 p-0 border-b-2 border-primary/20">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                              
                              {/* Left Column: Answers & Question Feedback */}
                              <div className="space-y-6">
                                <h3 className="font-bold text-lg border-b pb-2">Gegeven Antwoorden</h3>
                                {Object.keys(data.answers || {}).length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">Geen antwoorden geregistreerd.</p>
                                ) : (
                                  Object.entries(data.answers).map(([qId, ans]: [string, any], index) => (
                                    <div key={qId} className="bg-background border p-4 rounded-lg space-y-2 shadow-sm">
                                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vraag {index + 1}</div>
                                      <div className="font-semibold">{ans.questionText}</div>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {ans.selectedAnswers?.map((sa: any) => (
                                          <span key={sa.id} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm">
                                            {sa.text}
                                          </span>
                                        ))}
                                      </div>
                                      
                                      {/* Per Question Feedback */}
                                      {data.feedback?.[qId] && Object.keys(data.feedback[qId]).length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-dashed">
                                          <div className="text-xs font-bold text-primary mb-2">Feedback op deze vraag:</div>
                                          {Object.entries(data.feedback[qId]).map(([fbQId, fb]: [string, any]) => (
                                            <div key={fbQId} className="text-sm mb-2 last:mb-0">
                                              <span className="text-muted-foreground block">{fb.questionText}</span>
                                              {fb.rating && <span className="inline-block bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-xs mr-2">Score: {fb.rating}</span>}
                                              {fb.text && <span className="italic text-foreground/80">"{fb.text}"</span>}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Right Column: Results & Results Feedback */}
                              <div className="space-y-6">
                                <h3 className="font-bold text-lg border-b pb-2">Eindresultaat & Feedback</h3>
                                
                                {data.results ? (
                                  <div className="space-y-3">
                                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Berekende Top 3</div>
                                    {data.results.slice(0, 3).map((r: any, idx: number) => (
                                      <div key={r.slug} className={`flex justify-between items-center p-3 rounded-lg border ${idx === 0 ? 'bg-primary/5 border-primary/30' : 'bg-background'}`}>
                                        <span className="font-semibold">{idx + 1}. {r.name}</span>
                                        <span className={`font-black ${idx === 0 ? 'text-primary text-lg' : 'text-muted-foreground'}`}>{r.percentage}%</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Wizard nog niet afgerond (geen resultaten berekend).</p>
                                )}

                                {/* Results Feedback */}
                                {data.feedback?.results && Object.keys(data.feedback.results).length > 0 && (
                                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mt-6">
                                    <div className="text-sm font-bold text-primary uppercase tracking-wider mb-3">Feedback op resultaat</div>
                                    <div className="space-y-4">
                                      {Object.entries(data.feedback.results).map(([fbQId, fb]: [string, any]) => (
                                        <div key={fbQId} className="text-sm">
                                          <span className="font-medium block mb-1">{fb.questionText}</span>
                                          {fb.rating && <span className="inline-block bg-primary/20 text-primary font-bold px-2 py-0.5 rounded text-xs mr-2">Score: {fb.rating}</span>}
                                          {fb.text && <span className="italic text-foreground/80">"{fb.text}"</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                              </div>
                              
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
