// Authentication types
export interface AuthCredentials {
  username: string;
  password: string;
}

// Dashboard types
export interface DashboardStats {
  total_projects: number;
  completed: number;
  accuracy_rate: number;
}

export interface OasisProject {
  episode_id: string;
  created_at: string;
  status: string;
  guidelines_total?: number;
  ai_accepted?: number;
  ai_partially_accepted?: number;
  ai_rejected?: number;
  user_accepted?: number;
  user_partially_accepted_rejected?: number;
  user_rejected?: number;
  accuracy?: number;
}

export interface PaginationInfo {
  total_pages: number;
  total_count: number;
  has_prev: boolean;
  has_next: boolean;
}

// Document types
export interface DocumentData {
  documents: Array<{
    document_name: string;
    url: string;
    total_pages?: number;
    page_urls?: Record<string, string>;
  }>;
}

// OASIS Results types
export interface OasisResult {
  results: OasisParentGuideline[];
}

export interface OasisParentGuideline {
  guideline_id: string;
  title?: string;
  sub_questions: OasisChildGuideline[];
}

export interface OasisChildGuideline {
  guideline_id: string;
  guideline_type: string;
  question: string;
  ai_decision: 'accepted' | 'rejected';
  user_decision: 'pending' | 'accepted' | 'rejected';
  supporting_info: SupportingInfo[];
  rejection_note?: string | null;
  predicted_answer: string[];
  human_coder_answer: string[];
  match_with_coder: string;
  accuracy_score: number;
  reasoning?: string;
  option_descriptions?: OptionDescription[];
  instructions?: Instructions;
  is_evidence_from_clinician_response: string;
  comments: any[];
  user_decisions: any;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface SupportingInfo {
  document_name: string;
  page_number: number;
  supporting_sentence_in_document: string;
  section_name?: string;
  bbox?: number[];
  highlight_count?: number;
}

export interface OptionDescription {
  option: string;
  description: string;
}

export interface Instructions {
  title?: string;
  special_instructions?: string;
  response_specific_instructions?: string;
  coding_instructions?: string;
}

// Episode Status types
export interface EpisodeStatus {
  episode_id: string;
  status: string;
  is_locked?: boolean;
  error?: string;
}