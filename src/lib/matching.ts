import type { Profile, RoleMatch, MatchTier, Session } from './types';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'have',
  'will',
  'our',
  'you',
  'are',
  'who',
  'can',
  'all',
  'about',
  'their',
  'they',
  'been',
  'into',
  'more',
  'than',
  'years',
  'experience',
  'looking',
  'strong',
  'ability',
  'work',
  'team',
  'role',
  'ideal',
  'candidate',
]);

function roleHaystack(session: Session): string {
  const company = session.company_profile ?? {};
  return [
    company.role,
    company.ideal_candidate,
    company.pitch,
    company.what_they_do,
    company.what_makes_people_thrive,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

function extractRoleKeywords(roleText: string): string[] {
  const tokens = roleText
    .split(/[\s,;/|()]+/)
    .map((t) => t.replace(/[^a-zA-Z0-9+#.]/g, ''))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t.toLowerCase()));

  return [...new Set(tokens.map((t) => t.toLowerCase()))];
}

function scoreToTier(score: number): MatchTier {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 40) return 'partial';
  return 'weak';
}

export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  strong: 'Strong match',
  good: 'Good match',
  partial: 'Partial match',
  weak: 'Weak match',
};

export function computeRoleMatch(
  profile: Profile | null | undefined,
  session: Session,
): RoleMatch {
  if (!profile) {
    return {
      tier: 'weak',
      score: 0,
      matched_skills: [],
      missing_skills: [],
      highlights: [],
    };
  }

  const roleText = roleHaystack(session);
  const company = session.company_profile ?? {};
  const skills = profile.skills ?? [];
  const normalizedSkills = skills.map(normalizeSkill);

  const matched_skills = skills.filter((skill) =>
    roleText.includes(normalizeSkill(skill)),
  );

  const roleKeywords = extractRoleKeywords(roleText);
  const missing_skills = roleKeywords
    .filter(
      (keyword) =>
        !normalizedSkills.some(
          (skill) => skill.includes(keyword) || keyword.includes(skill),
        ),
    )
    .slice(0, 6)
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1));

  const skillCoverage =
    skills.length > 0 ? matched_skills.length / skills.length : 0;
  const roleKeywordHits = roleKeywords.filter((keyword) =>
    normalizedSkills.some(
      (skill) => skill.includes(keyword) || keyword.includes(skill),
    ),
  ).length;
  const keywordCoverage =
    roleKeywords.length > 0 ? roleKeywordHits / roleKeywords.length : 0;

  const openToMatch = (profile.open_to_roles ?? []).some((target) => {
    const t = target.toLowerCase();
    const roleTitle = (company.role ?? '').toLowerCase();
    return (
      roleText.includes(t) ||
      (roleTitle && (t.includes(roleTitle) || roleTitle.includes(t)))
    );
  });

  const currentRoleMatch = Boolean(
    profile.current_role &&
      roleText.split(/\s+/).some((word) => {
        if (word.length < 4) return false;
        return profile.current_role!.toLowerCase().includes(word);
      }),
  );

  const locationMatch = Boolean(
    profile.location &&
      roleText.includes(profile.location.toLowerCase().split(',')[0] ?? ''),
  );

  let score = Math.round(skillCoverage * 45 + keywordCoverage * 35);
  if (openToMatch) score += 15;
  if (currentRoleMatch) score += 10;
  if (locationMatch) score += 5;
  score = Math.min(100, Math.max(0, score));

  const highlights: string[] = [];
  if (matched_skills.length > 0) {
    highlights.push(`${matched_skills.length} skills align with this role`);
  }
  if (openToMatch) highlights.push('Matches roles you are open to');
  if (currentRoleMatch) highlights.push('Your background fits this position');
  if (locationMatch) highlights.push('Location may work for you');

  return {
    tier: scoreToTier(score),
    score,
    matched_skills,
    missing_skills,
    highlights,
  };
}

export function parseRoleMatch(raw: unknown): RoleMatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.tier || typeof obj.score !== 'number') return null;
  return {
    tier: obj.tier as MatchTier,
    score: obj.score as number,
    matched_skills: (obj.matched_skills as string[]) ?? [],
    missing_skills: (obj.missing_skills as string[]) ?? [],
    highlights: (obj.highlights as string[]) ?? [],
  };
}
