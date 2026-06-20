import type { Profile, RoleMatch, MatchTier, Session } from './types';

/** Canonical skill groups — any alias match counts as a hit */
const SKILL_GROUPS: string[][] = [
  ['react', 'reactjs', 'react.js', 'next.js', 'nextjs'],
  ['javascript', 'js', 'typescript', 'ts'],
  ['node', 'nodejs', 'node.js', 'express', 'express.js'],
  ['python', 'fastapi', 'django', 'flask'],
  ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite'],
  ['mongodb', 'mongo', 'documentdb', 'pocketbase'],
  ['aws', 'ec2', 'amazon web services', 's3', 'lambda'],
  ['docker', 'kubernetes', 'k8s', 'containers'],
  ['vite', 'webpack', 'rollup'],
  ['git', 'github', 'gitlab'],
  ['graphql', 'rest', 'restful'],
  ['tailwind', 'tailwind css', 'css'],
  ['java', 'spring', 'spring boot'],
  ['firebase', 'supabase'],
  ['tableau', 'power bi', 'data visualization', 'd3', 'd3.js'],
  ['matlab', 'numpy', 'pandas'],
  ['c++', 'cpp'],
  ['lingua franca', 'ros', 'embedded'],
];

const INTEGRATION_HINTS = [
  'razorpay',
  'google maps',
  'whatsapp',
  'tag manager',
  'gtm',
  'netlify',
  'stripe',
  'sendgrid',
  'twilio',
  'analytics',
];

function isIntegrationSkill(skill: string): boolean {
  const n = normalizeToken(skill);
  return INTEGRATION_HINTS.some(
    (hint) => n.includes(hint) || hint.includes(n),
  );
}

function hasSkillGroup(candidateSkills: string[], groupIndex: number): boolean {
  const group = SKILL_GROUPS[groupIndex];
  return candidateSkills.some((cs) => {
    const canonical = canonicalSkill(cs);
    return canonical != null && group.includes(canonical);
  });
}

function fullStackPillarBonus(candidateSkills: string[]): number {
  const hasFrontend = hasSkillGroup(candidateSkills, 0); // react
  const hasBackend =
    hasSkillGroup(candidateSkills, 2) || hasSkillGroup(candidateSkills, 3); // node/express or python
  const hasData =
    hasSkillGroup(candidateSkills, 4) || hasSkillGroup(candidateSkills, 5); // sql or mongo/pocketbase
  if (hasFrontend && hasBackend && hasData) return 10;
  if (hasFrontend && hasBackend) return 6;
  return 0;
}

const KNOWN_TECH_PATTERNS = [
  'react',
  'typescript',
  'javascript',
  'node',
  'express',
  'vite',
  'pocketbase',
  'fastapi',
  'django',
  'python',
  'postgresql',
  'postgres',
  'mysql',
  'mongodb',
  'mongo',
  'aws',
  'docker',
  'graphql',
  'next.js',
  'tailwind',
  'razorpay',
  'nginx',
  'netlify',
  'firebase',
  'java',
  'spring',
];

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.js$/i, 'js')
    .replace(/[^a-z0-9+# ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalSkill(skill: string): string | null {
  const n = normalizeToken(skill);
  if (!n) return null;
  for (const group of SKILL_GROUPS) {
    if (group.some((alias) => n === alias || n.includes(alias) || alias.includes(n))) {
      return group[0];
    }
  }
  return n.length >= 2 ? n : null;
}

function skillInCorpus(skill: string, corpus: string): boolean {
  const canonical = canonicalSkill(skill);
  if (!canonical) return false;

  for (const group of SKILL_GROUPS) {
    if (!group.includes(canonical)) continue;
    if (group.some((alias) => corpus.includes(alias))) return true;
  }

  return corpus.includes(canonical);
}

function skillsShareGroup(a: string, b: string): boolean {
  const ca = canonicalSkill(a);
  const cb = canonicalSkill(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  for (const group of SKILL_GROUPS) {
    if (group.includes(ca) && group.includes(cb)) return true;
  }
  return false;
}

function buildMatchCorpus(session: Session): string {
  const company = session.company_profile ?? {};
  const extras = (company.extras ?? {}) as Record<string, unknown>;
  const techStack = extras.technology_stack ?? extras.tech_stack;
  const techStackText = Array.isArray(techStack)
    ? techStack.join(' ')
    : typeof techStack === 'string'
      ? techStack
      : '';

  return [
    company.role,
    company.ideal_candidate,
    company.pitch,
    company.what_they_do,
    company.what_makes_people_thrive,
    company.industry,
    techStackText,
    typeof extras.location === 'string' ? extras.location : '',
    session.uploaded_file_text,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function extractRequiredSkills(session: Session, corpus: string): string[] {
  const company = session.company_profile ?? {};
  const extras = (company.extras ?? {}) as Record<string, unknown>;
  const techStack = extras.technology_stack ?? extras.tech_stack;
  const required: string[] = [];

  if (Array.isArray(techStack)) {
    for (const item of techStack) {
      const label = String(item).trim();
      if (label) required.push(label);
    }
  } else if (typeof techStack === 'string' && techStack.trim()) {
    required.push(...techStack.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean));
  }

  // Fall back to ideal-candidate tech mentions when no explicit stack is listed
  if (required.length === 0) {
    for (const pattern of KNOWN_TECH_PATTERNS) {
      if (corpus.includes(pattern)) {
        required.push(pattern);
      }
    }
  }

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const skill of required) {
    const key = canonicalSkill(skill) ?? skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(skill);
    }
  }
  return deduped;
}

function candidateMatchesRequirement(
  candidateSkills: string[],
  requirement: string,
): boolean {
  const reqCanonical = canonicalSkill(requirement);
  if (!reqCanonical) return false;
  return candidateSkills.some((cs) => {
    const csCanonical = canonicalSkill(cs);
    if (!csCanonical) return false;
    if (csCanonical === reqCanonical) return true;
    for (const group of SKILL_GROUPS) {
      if (group.includes(csCanonical) && group.includes(reqCanonical)) return true;
    }
    return false;
  });
}

function weightedRequiredCoverage(
  candidateSkills: string[],
  requiredSkills: string[],
): number {
  if (requiredSkills.length === 0) return 0;

  let coreTotal = 0;
  let coreMatched = 0;
  let integrationTotal = 0;
  let integrationMatched = 0;

  for (const req of requiredSkills) {
    const matched = candidateMatchesRequirement(candidateSkills, req);
    if (isIntegrationSkill(req)) {
      integrationTotal += 1;
      if (matched) integrationMatched += 1;
    } else {
      coreTotal += 1;
      if (matched) coreMatched += 1;
    }
  }

  if (coreTotal === 0 && integrationTotal === 0) return 0;

  const coreRatio = coreTotal > 0 ? coreMatched / coreTotal : 1;
  const integrationRatio =
    integrationTotal > 0 ? integrationMatched / integrationTotal : 1;

  return coreRatio * 0.85 + integrationRatio * 0.15;
}

function parseExperienceRange(corpus: string): { min: number; max: number } | null {
  const match = corpus.match(/(\d+)\s*[-–to]+\s*(\d+)\s*years?/i);
  if (match) {
    return { min: Number(match[1]), max: Number(match[2]) };
  }
  const plusMatch = corpus.match(/(\d+)\+\s*years?/i);
  if (plusMatch) {
    const min = Number(plusMatch[1]);
    return { min, max: min + 5 };
  }
  return null;
}

function experienceFitScore(
  years: number | null | undefined,
  range: { min: number; max: number } | null,
): number {
  if (years == null || !range) return 0;
  if (years >= range.min && years <= range.max) return 15;
  if (years >= range.min - 1 && years <= range.max + 2) return 10;
  if (years >= range.min - 2 && years <= range.max + 4) return 5;
  return 0;
}

function roleTitleMatch(profile: Profile, company: Session['company_profile'], corpus: string): boolean {
  const roleTitle = (company?.role ?? '').toLowerCase();
  const openTo = (profile.open_to_roles ?? []).map((r) => r.toLowerCase());
  const current = (profile.current_role ?? '').toLowerCase();

  const titleTokens = ['full-stack', 'full stack', 'frontend', 'front-end', 'backend', 'software engineer', 'web developer'];
  for (const token of titleTokens) {
    if (!corpus.includes(token) && !roleTitle.includes(token)) continue;
    if (openTo.some((r) => r.includes(token) || token.includes(r))) return true;
    if (current.includes(token)) return true;
  }

  if (openTo.some((target) => roleTitle.includes(target) || target.includes(roleTitle.slice(0, 20)))) {
    return true;
  }

  if (roleTitle.includes('full-stack') || roleTitle.includes('full stack')) {
    if (
      openTo.some((r) => r.includes('full-stack') || r.includes('full stack')) ||
      current.includes('full-stack') ||
      current.includes('full stack') ||
      current.includes('developer') ||
      current.includes('engineer')
    ) {
      return true;
    }
  }

  return false;
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

  const corpus = buildMatchCorpus(session);
  const company = session.company_profile ?? {};
  const candidateSkills = profile.skills ?? [];
  const requiredSkills = extractRequiredSkills(session, corpus);

  const matched_skills = candidateSkills.filter((skill) => skillInCorpus(skill, corpus));

  const matchedRequired = requiredSkills.filter((req) =>
    candidateMatchesRequirement(candidateSkills, req),
  );

  const missing_skills = requiredSkills
    .filter((req) => !matchedRequired.some((m) => skillsShareGroup(m, req)))
    .slice(0, 6)
    .map((s) => {
      const formatted = s.charAt(0).toUpperCase() + s.slice(1);
      return formatted.length > 24 ? `${formatted.slice(0, 21)}...` : formatted;
    });

  const requiredCoverage =
    requiredSkills.length > 0
      ? weightedRequiredCoverage(candidateSkills, requiredSkills)
      : matched_skills.length > 0
        ? Math.min(1, matched_skills.length / 6)
        : 0;

  const candidateRelevance =
    candidateSkills.length > 0 ? matched_skills.length / candidateSkills.length : 0;

  const openToMatch = roleTitleMatch(profile, company, corpus);
  const expRange = parseExperienceRange(corpus);
  const expScore = experienceFitScore(profile.experience_years, expRange);
  const pillarBonus = fullStackPillarBonus(candidateSkills);

  const locationMatch = Boolean(
    profile.location &&
      corpus.includes(profile.location.toLowerCase().split(',')[0] ?? ''),
  );

  let score = Math.round(
    requiredCoverage * 55 +
      candidateRelevance * 15 +
      (openToMatch ? 15 : 0) +
      expScore +
      pillarBonus +
      (locationMatch ? 5 : 0),
  );
  score = Math.min(100, Math.max(0, score));

  const highlights: string[] = [];
  if (matchedRequired.length > 0) {
    highlights.push(
      `Matches ${matchedRequired.length} of ${requiredSkills.length} role requirements`,
    );
  } else if (matched_skills.length > 0) {
    highlights.push(`${matched_skills.length} skills align with this role`);
  }
  if (openToMatch) highlights.push('Role fits your target positions');
  if (pillarBonus >= 10) highlights.push('Full-stack profile matches this role');
  else if (pillarBonus > 0) highlights.push('Frontend and backend skills align');
  if (expScore >= 10) highlights.push('Experience level aligns with this role');
  if (expScore > 0 && expScore < 10) highlights.push('Experience is close to what they want');
  if (locationMatch) highlights.push('Location may work for you');

  return {
    tier: scoreToTier(score),
    score,
    matched_skills: matched_skills.length > 0 ? matched_skills : matchedRequired,
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
