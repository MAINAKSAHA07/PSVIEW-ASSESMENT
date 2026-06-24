import type { CompanyProfile } from './types';

export const APP_NAME = 'AgentForge';

export const KEY_PROFILE_FIELDS: Array<{
  key: keyof CompanyProfile;
  label: string;
}> = [
  { key: 'company_name', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'size', label: 'Size' },
  { key: 'culture', label: 'Culture' },
  { key: 'role', label: 'Role' },
  { key: 'ideal_candidate', label: 'Candidate' },
  { key: 'pitch', label: 'Pitch' },
  { key: 'tone', label: 'Tone' },
];

export const REQUIRED_FIELDS: Array<keyof CompanyProfile> = [
  'company_name',
  'industry',
  'size',
  'culture',
  'role',
  'ideal_candidate',
  'pitch',
  'tone',
];

export const QUICK_REPLY_SUGGESTIONS = [
  "I'm interested, tell me more",
  "I'm not looking right now",
  "What's the compensation?",
];

export const INTEGRATION_PROVIDERS = [
  { id: 'workday', name: 'Workday', status: 'coming_soon' as const },
  { id: 'greenhouse', name: 'Greenhouse', status: 'coming_soon' as const },
  { id: 'lever', name: 'Lever', status: 'coming_soon' as const },
  { id: 'bullhorn', name: 'Bullhorn', status: 'coming_soon' as const },
  { id: 'linkedin_rsc', name: 'LinkedIn RSC', status: 'coming_soon' as const },
  { id: 'custom_ats', name: 'Custom ATS', status: 'coming_soon' as const },
];

export const TRAIT_LABELS: Record<string, { low: string; high: string }> = {
  formality: { low: 'Casual', high: 'Formal' },
  warmth: { low: 'Reserved', high: 'Warm' },
  assertiveness: { low: 'Gentle', high: 'Bold' },
  humor: { low: 'Serious', high: 'Playful' },
};

export const CONFIG_TURN_LIMIT = 8;
export const CONFIG_OFFER_AFTER = 5;

export function getOpeningMessage(firstName: string): string {
  return `Hey ${firstName}, I'll be your recruiting agent. Drop a file, paste a job posting URL, or tell me what you're hiring for.`;
}

const URL_PATTERN = /^https?:\/\//i;

export function isUrlOnlyMessage(text: string): boolean {
  return URL_PATTERN.test(text.trim());
}

export function getProfileGaps(profile: CompanyProfile): string[] {
  const sources = profile.field_sources ?? {};
  return REQUIRED_FIELDS.filter((field) => {
    const value = profile[field];
    const source = sources[field as string];
    return !value || !source?.source || (source.confidence ?? 0) < 0.7;
  }).map((field) => {
    const match = KEY_PROFILE_FIELDS.find((f) => f.key === field);
    return match?.label ?? field;
  });
}

export function isProfileReady(profile: CompanyProfile): boolean {
  return getProfileGaps(profile).length === 0;
}
