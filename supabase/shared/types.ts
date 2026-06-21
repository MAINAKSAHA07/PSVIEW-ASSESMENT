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

export interface AgentPersona {
  name: string;
  summary: string;
  traits: {
    formality: number;
    warmth: number;
    assertiveness: number;
    humor: number;
  };
  style_notes: string[];
  vocabulary_do: string[];
  vocabulary_dont: string[];
}

export interface AgentStrategy {
  sequence_length: number;
  steps: Array<{
    position: number;
    intent: string;
    approach: string;
    tone_target: string;
  }>;
  objection_playbook: Record<string, string>;
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
  agent_action?: {
    action: string;
    goal: string;
    rationale: string;
  };
}

export const REQUIRED_FIELDS = [
  'company_name',
  'industry',
  'size',
  'culture',
  'role',
  'ideal_candidate',
  'pitch',
  'tone',
] as const;

export function getProfileGaps(profile: CompanyProfile): string[] {
  const sources = profile.field_sources ?? {};
  return REQUIRED_FIELDS.filter((field) => {
    const value = profile[field];
    const source = sources[field];
    return !value || !source?.source || (source.confidence ?? 0) < 0.7;
  });
}

export function isProfileReady(profile: CompanyProfile): boolean {
  return getProfileGaps(profile).length === 0;
}

export function mergeExtraction(
  profile: CompanyProfile,
  updatedFields: Record<string, { value: string; confidence: number }>,
  sourceTag: string,
): CompanyProfile {
  const result = { ...profile, field_sources: { ...profile.field_sources } };
  for (const [key, { value, confidence }] of Object.entries(updatedFields)) {
    if (confidence >= 0.7 && value) {
      (result as Record<string, unknown>)[key] = value;
      result.field_sources = result.field_sources ?? {};
      result.field_sources[key] = { source: sourceTag, confidence };
    }
  }
  return result;
}
