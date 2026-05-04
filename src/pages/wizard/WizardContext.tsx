import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminService } from '@/services/admin';
import { DEFAULT_SCORING_SETTINGS, ScoringSettings } from '@/services/calculator';

interface WizardState {
  questionnaireId: string | null;
  supplierPrefix: 'essent' | 'energiedirect' | null;
  answers: Record<string, string[]>; // questionId -> array of selected answerIds
  feedbackAnswers: Record<string, Record<string, { rating?: any, text?: string }>>; // wizardQuestionId -> feedbackQuestionId -> data
  questionnaireData: any | null;
  globalFeedbackQuestions: any[];
  scoringSettings: ScoringSettings;
  loadingData: boolean;
  setAnswer: (questionId: string, answerIds: string[]) => void;
  setFeedbackAnswer: (wizardQuestionId: string, feedbackQuestionId: string, field: 'rating' | 'text', value: any) => void;
  loadQuestionnaire: (id: string, supplier: 'essent' | 'energiedirect') => void;
  setResultsData: (data: any[]) => void;
}

const WizardContext = createContext<WizardState | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [supplierPrefix, setSupplierPrefix] = useState<'essent' | 'energiedirect' | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<string, Record<string, { rating?: any, text?: string }>>>({});
  const [questionnaireData, setQuestionnaireData] = useState<any | null>(null);
  const [globalFeedbackQuestions, setGlobalFeedbackQuestions] = useState<any[]>([]);
  const [scoringSettings, setScoringSettings] = useState<ScoringSettings>(DEFAULT_SCORING_SETTINGS);
  const [loadingData, setLoadingData] = useState(true);
  const [sessionId] = useState(() => crypto.randomUUID());
  
  // Track final results so we can sync them too
  const [resultsData, setResultsData] = useState<any[] | null>(null);

  useEffect(() => {
    if (questionnaireId) {
       setLoadingData(true);
       Promise.all([
         adminService.getQuestionnaireFull(questionnaireId),
         adminService.getScoringSettings().catch(() => null),
         adminService.getGlobalFeedbackQuestions().catch(() => []),
       ])
         .then(([data, settings, feedbackQs]) => {
           setQuestionnaireData(data);
           setGlobalFeedbackQuestions(feedbackQs || []);
           if (settings) {
             setScoringSettings({
               base_min_percentage: settings.base_min_percentage,
               final_min_percentage: settings.final_min_percentage,
               adjustment_max_points: settings.adjustment_max_points,
               non_optimal_ceiling: settings.non_optimal_ceiling,
               optimal_ceiling: settings.optimal_ceiling,
               neutral_when_empty_percentage: settings.neutral_when_empty_percentage,
             });
           }
         })
         .catch(err => console.error("Could not load wizard", err))
         .finally(() => setLoadingData(false));
    }
  }, [questionnaireId]);

  // Live Sync Effect
  useEffect(() => {
    if (!questionnaireId || !supplierPrefix || !questionnaireData) return;

    // Debounce the sync to avoid hammering the DB on every keystroke
    const timer = setTimeout(() => {
      
      // Build enriched answer data with actual text
      const enrichedAnswers: Record<string, any> = {};
      Object.entries(answers).forEach(([qId, selectedIds]) => {
        const question = questionnaireData.questions?.find((q: any) => q.id === qId);
        if (question) {
          const selected = question.answers?.filter((a: any) => selectedIds.includes(a.id)) || [];
          enrichedAnswers[qId] = {
            questionText: question.text,
            selectedAnswers: selected.map((a: any) => ({ id: a.id, text: a.text }))
          };
        }
      });

      // Build enriched feedback data
      const enrichedFeedback: Record<string, any> = {};
      Object.entries(feedbackAnswers).forEach(([wQId, fbData]) => {
        enrichedFeedback[wQId] = {};
        Object.entries(fbData).forEach(([fbQId, fbAns]) => {
          const fbQ = globalFeedbackQuestions.find((q: any) => q.id === fbQId);
          enrichedFeedback[wQId][fbQId] = {
            ...fbAns,
            questionText: fbQ?.text || 'Unknown question'
          };
        });
      });

      const session_data = {
        answers: enrichedAnswers,
        feedback: enrichedFeedback,
        results: resultsData
      };

      adminService.upsertUserSession({
        id: sessionId,
        questionnaire_id: questionnaireId,
        supplier_slug: supplierPrefix,
        session_data
      }).catch(err => console.error("Failed to sync session", err));

    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [answers, feedbackAnswers, resultsData, questionnaireId, supplierPrefix, questionnaireData, globalFeedbackQuestions, sessionId]);

  const setAnswer = (questionId: string, answerIds: string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIds }));
  };

  const setFeedbackAnswer = (wizardQuestionId: string, feedbackQuestionId: string, field: 'rating' | 'text', value: any) => {
    setFeedbackAnswers(prev => {
      const wizardAnswers = prev[wizardQuestionId] || {};
      const feedbackAnswer = wizardAnswers[feedbackQuestionId] || {};
      return {
        ...prev,
        [wizardQuestionId]: {
          ...wizardAnswers,
          [feedbackQuestionId]: {
            ...feedbackAnswer,
            [field]: value
          }
        }
      };
    });
  };

  const loadQuestionnaire = (id: string, supplier: 'essent' | 'energiedirect') => {
    if (id !== questionnaireId) {
      setQuestionnaireId(id);
      setSupplierPrefix(supplier);
    }
  };

  return (
    <WizardContext.Provider value={{ 
      questionnaireId, supplierPrefix, answers, feedbackAnswers, 
      questionnaireData, globalFeedbackQuestions, scoringSettings, 
      loadingData, setAnswer, setFeedbackAnswer, loadQuestionnaire,
      setResultsData
    }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
