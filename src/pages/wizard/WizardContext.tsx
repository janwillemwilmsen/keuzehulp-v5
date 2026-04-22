import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminService } from '@/services/admin';

interface WizardState {
  questionnaireId: string | null;
  supplierPrefix: 'essent' | 'energiedirect' | null;
  answers: Record<string, string[]>; // questionId -> array of selected answerIds
  questionnaireData: any | null;
  loadingData: boolean;
  setAnswer: (questionId: string, answerIds: string[]) => void;
  loadQuestionnaire: (id: string, supplier: 'essent' | 'energiedirect') => void;
}

const WizardContext = createContext<WizardState | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [supplierPrefix, setSupplierPrefix] = useState<'essent' | 'energiedirect' | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionnaireData, setQuestionnaireData] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (questionnaireId) {
       setLoadingData(true);
       adminService.getQuestionnaireFull(questionnaireId)
         .then(data => setQuestionnaireData(data))
         .catch(err => console.error("Could not load wizard", err))
         .finally(() => setLoadingData(false));
    }
  }, [questionnaireId]);

  const setAnswer = (questionId: string, answerIds: string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIds }));
  };

  const loadQuestionnaire = (id: string, supplier: 'essent' | 'energiedirect') => {
    if (id !== questionnaireId) {
      setQuestionnaireId(id);
      setSupplierPrefix(supplier);
    }
  };

  return (
    <WizardContext.Provider value={{ questionnaireId, supplierPrefix, answers, questionnaireData, loadingData, setAnswer, loadQuestionnaire }}>
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
