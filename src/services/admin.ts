import { supabase } from '@/lib/supabase';

// Helper to handle API results
const handleApiResult = async (promise: PromiseLike<any>) => {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
};

export const adminService = {
  // Fetch all questionnaires for Dashboard
  getQuestionnaires: async () => {
    return handleApiResult(
      supabase.from('questionnaires').select(`
        id, title, is_published, created_at,
        suppliers ( name )
      `).order('created_at', { ascending: false })
    );
  },

  // Create empty questionnaire
  createQuestionnaire: async (title: string, supplier_id: string) => {
    return handleApiResult(
      supabase.from('questionnaires').insert([{
        title,
        supplier_id,
        is_published: true // the user requested direct save without drafts
      }]).select().single()
    );
  },

  // Fetch Full Questionnaire Graph (Deep relational query)
  getQuestionnaireFull: async (id: string) => {
    return handleApiResult(
      supabase.from('questionnaires').select(`
        *,
        suppliers (
          id, name, slug,
          supplier_contract_types (
            contract_types ( id, slug, name, description, order_index )
          )
        ),
        questions (
          id, text, type, order_index, explanation_positive, explanation_neutral, explanation_negative,
          answers (
            id, text, order_index,
            answer_scores (
              id, contract_type_id, score, explanation_text, explanation_type,
              contract_types ( id, slug, name, order_index )
            )
          )
        )
      `)
      .eq('id', id)
      .single()
    );
  },

  // Update root questionnaire meta
  updateQuestionnaire: async (id: string, payload: any) => {
    return handleApiResult(supabase.from('questionnaires').update(payload).eq('id', id));
  },

  // Delete questionnaire (cascades to questions, answers, scores)
  deleteQuestionnaire: async (id: string) => {
    return handleApiResult(supabase.from('questionnaires').delete().eq('id', id));
  },

  // Questions
  addQuestion: async (questionnaire_id: string, text: string, type: string = 'single') => {
    return handleApiResult(
      supabase.from('questions').insert([{ questionnaire_id, text, type }]).select().single()
    );
  },
  
  updateQuestion: async (id: string, payload: any) => {
    return handleApiResult(supabase.from('questions').update(payload).eq('id', id));
  },
  
  deleteQuestion: async (id: string) => {
    return handleApiResult(supabase.from('questions').delete().eq('id', id));
  },

  // Answers
  addAnswer: async (question_id: string, text: string) => {
    return handleApiResult(
      supabase.from('answers').insert([{ question_id, text }]).select().single()
    );
  },
  
  updateAnswer: async (id: string, payload: any) => {
    return handleApiResult(supabase.from('answers').update(payload).eq('id', id));
  },
  
  deleteAnswer: async (id: string) => {
    return handleApiResult(supabase.from('answers').delete().eq('id', id));
  },

  upsertAnswerScore: async (
    answer_id: string,
    contract_type_id: string,
    score: number,
    explanation_text?: string | null,
    explanation_type?: string | null
  ) => {
    return handleApiResult(
      supabase.from('answer_scores').upsert({
        answer_id,
        contract_type_id,
        score,
        explanation_text: explanation_text ?? null,
        explanation_type: explanation_type ?? null
      }, { onConflict: 'answer_id, contract_type_id' }).select().single()
    );
  },
  
  // Helpers
  getSuppliers: async () => {
    return handleApiResult(supabase.from('suppliers').select('*'));
  },

  getContractTypes: async () => {
    return handleApiResult(
      supabase.from('contract_types').select('*').order('order_index', { ascending: true })
    );
  }
};
