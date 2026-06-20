export type SessionStatus = 'configuring' | 'synthesizing' | 'ready' | 'simulating';
export type ConfigSource = 'conversation' | 'upload' | 'quicksetup';
export type MessagePhase = 'config' | 'simulation';
export type MessageRole = 'agent' | 'user' | 'system';

export type UserRole = 'admin' | 'employer' | 'candidate';
export type ApplicationStatus =
  | 'applied'
  | 'agent_engaged'
  | 'in_conversation'
  | 'interview_scheduled'
  | 'declined'
  | 'withdrawn';

export type MatchTier = 'strong' | 'good' | 'partial' | 'weak';

export interface RoleMatch {
  tier: MatchTier;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  highlights: string[];
}

export interface ParsedResume {
  full_name: string | null;
  current_role: string | null;
  linkedin_url: string | null;
  skills: string[];
  experience_years: number | null;
  location: string | null;
  open_to_roles: string[];
}

export interface CandidateSummary {
  interest_level: 'high' | 'medium' | 'low' | 'declined';
  interest_label: string;
  key_motivators: string[];
  concerns: string[];
  signals_detected: string[];
  recommended_next_step: string;
  engagement_score: number;
  conversation_turns: number;
  objections_raised: string[];
  objections_resolved: string[];
}

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  role: UserRole | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  company_name: string | null;
  current_role: string | null;
  linkedin_url: string | null;
  resume_text: string | null;
  skills: string[];
  experience_years: number | null;
  location: string | null;
  open_to_roles: string[];
  availability: string;
}

export interface CandidateApplication {
  id: string;
  created_at: string;
  candidate_id: string;
  session_id: string;
  status: ApplicationStatus;
  candidate_summary: CandidateSummary;
  conversation_session_id: string | null;
  notes: string | null;
  match_score: RoleMatch | null;
  candidate?: Profile;
}

export interface FieldSource {
  source: string | null;
  confidence: number | null;
}

export interface CompanyProfile {
  company_name?: string;
  industry?: string;
  size?: string;
  stage?: string;
  what_they_do?: string;
  culture?: string;
  what_makes_people_thrive?: string;
  role?: string;
  ideal_candidate?: string;
  pitch?: string;
  tone?: string;
  extras?: Record<string, string>;
  field_sources?: Record<string, FieldSource>;
}

export interface AgentTraits {
  formality: number;
  warmth: number;
  assertiveness: number;
  humor: number;
}

export interface AgentPersona {
  name: string;
  summary: string;
  traits: AgentTraits;
  style_notes: string[];
  vocabulary_do: string[];
  vocabulary_dont: string[];
}

export interface StrategyStep {
  position: number;
  intent: string;
  approach: string;
  tone_target: string;
}

export interface AgentStrategy {
  sequence_length: number;
  steps: StrategyStep[];
  objection_playbook: Record<string, string>;
}

export interface CandidateContext {
  name?: string;
  background?: string;
  linkedin_summary?: string;
}

export interface ReasoningTrace {
  candidate_analysis: {
    sentiment: string;
    intent: string;
    signals: string[];
  };
  strategy_adjustment: string;
  persona_check: {
    tone_match: boolean;
    vocabulary_compliance: boolean;
    notes: string;
  };
  message_rationale: string;
  strategy_position: string;
}

export interface CandidateAnalysis {
  sentiment: string;
  intent: string;
  signals: string[];
}

export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: SessionStatus;
  config_source: ConfigSource;
  uploaded_file_text: string | null;
  company_profile: CompanyProfile;
  agent_persona: AgentPersona;
  agent_strategy: AgentStrategy;
  candidate_context: CandidateContext;
  source_integration: string | null;
  candidate_source: Record<string, unknown>;
  is_published?: boolean;
  published_at?: string | null;
  application_count?: number;
  candidate_summary?: CandidateSummary | Record<string, never>;
  parent_session_id?: string | null;
}

export interface Message {
  id: string;
  session_id: string;
  created_at: string;
  phase: MessagePhase;
  role: MessageRole;
  content: string;
  reasoning: ReasoningTrace | null;
}

export interface ConfigureResponse {
  agent_reply?: string;
  company_profile: CompanyProfile;
  ready_to_synthesize: boolean;
  gaps?: string[];
}

export interface SynthesizeResponse {
  agent_persona: AgentPersona;
  agent_strategy: AgentStrategy;
  first_message: {
    content: string;
    reasoning: ReasoningTrace;
  };
}

export interface SimulateResponse {
  agent_message: string;
  reasoning?: ReasoningTrace;
  candidate_analysis?: CandidateAnalysis;
}

export interface SimulateAnalyzeResponse {
  candidate_analysis: CandidateAnalysis;
  strategy_check?: {
    adjustment_needed: boolean;
    adjustment_rationale: string;
    active_playbook: string | null;
  };
  reasoning?: ReasoningTrace;
}

export interface SummarizeResponse {
  candidate_summary: CandidateSummary;
}

export type AppPhase = 'landing' | SessionStatus;

export interface SessionState {
  session: Session | null;
  messages: Message[];
  phase: AppPhase;
  isLoading: boolean;
  error: string | null;
}

export type SessionAction =
  | { type: 'SET_SESSION'; payload: Session }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_PHASE'; payload: AppPhase }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_PROFILE'; payload: CompanyProfile }
  | { type: 'RESET' };
