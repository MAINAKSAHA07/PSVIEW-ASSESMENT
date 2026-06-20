export type SessionStatus = 'configuring' | 'synthesizing' | 'ready' | 'simulating';
export type ConfigSource = 'conversation' | 'upload' | 'quicksetup';
export type MessagePhase = 'config' | 'simulation';
export type MessageRole = 'agent' | 'user' | 'system';

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
  reasoning: ReasoningTrace;
  candidate_analysis: CandidateAnalysis;
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
