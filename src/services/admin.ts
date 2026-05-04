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

  // Create empty questionnaire. Seeds the per-questionnaire contract-type
  // list from whatever the supplier offers, so a fresh questionnaire
  // behaves identically to the pre-per-questionnaire-override world.
  createQuestionnaire: async (title: string, supplier_id: string) => {
    const created = await handleApiResult(
      supabase.from('questionnaires').insert([{
        title,
        supplier_id,
        is_published: true // the user requested direct save without drafts
      }]).select().single()
    );

    // Seed questionnaire_contract_types from supplier_contract_types.
    const sct = await handleApiResult(
      supabase.from('supplier_contract_types')
        .select('contract_type_id')
        .eq('supplier_id', supplier_id)
    );
    const seedRows = (sct ?? []).map((row: any) => ({
      questionnaire_id: created.id,
      contract_type_id: row.contract_type_id,
    }));
    if (seedRows.length > 0) {
      await handleApiResult(
        supabase.from('questionnaire_contract_types').insert(seedRows)
      );
    }

    return created;
  },

  // Fetch Full Questionnaire Graph (Deep relational query).
  // Loads the per-questionnaire contract types so the editor + wizard
  // know exactly which contract types are in scope for THIS questionnaire.
  // Also pulls the supplier's brand colors so the wizard can theme itself.
  getQuestionnaireFull: async (id: string) => {
    return handleApiResult(
      supabase.from('questionnaires').select(`
        id, title, intro_text, usps, supplier_id, is_published, show_debug, show_results_feedback, created_at,
        suppliers (
          id, name, slug,
          color_background, color_primary, color_primary_foreground, color_title
        ),
        questionnaire_contract_types (
          contract_types ( id, slug, name, subtitle, description, order_index )
        ),
        questions (
          id, text, type, show_feedback, order_index,
          answers (
            id, text, description, order_index,
            answer_scores (
              id, contract_type_id, score, explanation_text,
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
    explanation_text?: string | null
  ) => {
    return handleApiResult(
      supabase.from('answer_scores').upsert({
        answer_id,
        contract_type_id,
        score,
        explanation_text: explanation_text ?? null
      }, { onConflict: 'answer_id, contract_type_id' }).select().single()
    );
  },
  
  // Helpers
  getSuppliers: async () => {
    return handleApiResult(supabase.from('suppliers').select('*').order('name'));
  },

  // Edit a supplier — used by the brand-themes admin page to persist
  // per-brand colors (background, primary, primary-foreground, title).
  updateSupplier: async (
    id: string,
    payload: Partial<{
      name: string;
      color_background: string;
      color_primary: string;
      color_primary_foreground: string;
      color_title: string;
    }>
  ) => {
    return handleApiResult(
      supabase.from('suppliers').update(payload).eq('id', id).select().single()
    );
  },

  getContractTypes: async () => {
    return handleApiResult(
      supabase.from('contract_types').select('*').order('order_index', { ascending: true })
    );
  },

  // Edit an individual contract type. Primarily used to maintain the
  // customer-facing copy shown on the wizard results page (subtitle line
  // under the contract name + the longer product description below it).
  updateContractType: async (
    id: string,
    payload: { name?: string; subtitle?: string | null; description?: string | null }
  ) => {
    return handleApiResult(
      supabase.from('contract_types').update(payload).eq('id', id).select().single()
    );
  },

  // Toggle whether a given contract type is active for a questionnaire.
  // Insert when enabling, delete when disabling — order is preserved
  // at read time via contract_types.order_index, so we never store it here.
  setQuestionnaireContractType: async (
    questionnaire_id: string,
    contract_type_id: string,
    enabled: boolean
  ) => {
    if (enabled) {
      return handleApiResult(
        supabase
          .from('questionnaire_contract_types')
          .upsert({ questionnaire_id, contract_type_id }, {
            onConflict: 'questionnaire_id, contract_type_id',
          })
      );
    }
    return handleApiResult(
      supabase
        .from('questionnaire_contract_types')
        .delete()
        .eq('questionnaire_id', questionnaire_id)
        .eq('contract_type_id', contract_type_id)
    );
  },

  // Scoring engine settings (singleton row)
  getScoringSettings: async () => {
    return handleApiResult(
      supabase.from('scoring_settings').select('*').eq('id', 'default').single()
    );
  },

  updateScoringSettings: async (payload: Record<string, number> | Record<string, any>) => {
    return handleApiResult(
      supabase.from('scoring_settings')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', 'default')
        .select()
        .single()
    );
  },

  // Global Feedback Questions
  getGlobalFeedbackQuestions: async () => {
    return handleApiResult(
      supabase.from('global_feedback_questions').select('*').order('order_index', { ascending: true })
    );
  },

  addGlobalFeedbackQuestion: async (category: string, text: string, rating_type: string, has_open_field: boolean, order_index: number) => {
    return handleApiResult(
      supabase.from('global_feedback_questions').insert([{ category, text, rating_type, has_open_field, order_index }]).select().single()
    );
  },

  updateGlobalFeedbackQuestion: async (id: string, payload: any) => {
    return handleApiResult(supabase.from('global_feedback_questions').update(payload).eq('id', id));
  },

  deleteGlobalFeedbackQuestion: async (id: string) => {
    return handleApiResult(supabase.from('global_feedback_questions').delete().eq('id', id));
  },
};
