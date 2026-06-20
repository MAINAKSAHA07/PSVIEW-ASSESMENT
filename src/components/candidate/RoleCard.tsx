import type { Profile, Session } from '../../lib/types';

interface RoleCardProps {
  session: Session;
  profile: Profile | null;
  onTalk: (sessionId: string) => void;
  loading?: boolean;
}

function matchSkills(candidateSkills: string[], roleText: string): string[] {
  const haystack = roleText.toLowerCase();
  return candidateSkills.filter((skill) =>
    haystack.includes(skill.toLowerCase()),
  );
}

export function RoleCard({ session, profile, onTalk, loading }: RoleCardProps) {
  const company = session.company_profile ?? {};
  const roleText = [
    company.role,
    company.ideal_candidate,
    company.pitch,
    company.what_they_do,
  ]
    .filter(Boolean)
    .join(' ');
  const matched = matchSkills(profile?.skills ?? [], roleText);

  return (
    <div className="rounded-lg border border-line bg-app-card p-5">
      <h3 className="font-medium text-fg-primary">{company.role ?? 'Open role'}</h3>
      <p className="mt-1 text-sm text-fg-secondary">
        {company.company_name ?? 'Company'} · {company.industry ?? 'Industry'} ·{' '}
        {company.size ?? 'Team size'}
      </p>
      {company.pitch && (
        <p className="mt-3 text-sm italic text-fg-primary">
          &ldquo;{company.pitch}&rdquo;
        </p>
      )}
      {matched.length > 0 && (
        <p className="mt-3 text-xs text-teal">
          Skills match: {matched.map((s) => `${s} ✓`).join('  ')}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onTalk(session.id)}
          disabled={loading}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Talk to the agent →'}
        </button>
      </div>
    </div>
  );
}
