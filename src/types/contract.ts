export type ContractType = 'variabel' | 'vast1' | 'vast3' | 'dynamisch' | 'timeofuse';

export interface Scores {
  variabel: number;
  vast1: number;
  vast2?: number; // some suppliers have this, some don't. The test example mentions vast2. Wait, the user's snippet omits vast2. I will include what they had, but maybe make it dynamic if they missed it. Let's start exactly as their snippet:
  vast3: number;
  dynamisch: number;
}

export interface QuestionOptionScore {
  variabel: number;
  vast1: number;
  vast3: number;
  dynamisch: number;
  // I will add what they had in their snippet, it seems they only had 4.
}

export interface QuestionOption {
  text: string;
  score: QuestionOptionScore;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface ContractStrength {
  status: 'optimal' | 'neutral' | 'negative';
  description: string;
}
