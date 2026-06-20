import type { Profile, RoleMatch, Session } from '../../lib/types';
import { MatchBadge } from '../shared/MatchBadge';
import { MatchBreakdown } from '../shared/MatchBreakdown';

interface RoleCardProps {
  session: Session;
  profile: Profile | null;
  match: RoleMatch;
  onTalk: (sessionId: string) => void;
  loading?: boolean;
}

export function RoleCard({
  session,
  profile,
  match,
  onTalk,
  loading,
}: RoleCardProps) {
  const company = session.company_profile ?? {};

  return (
    <div className="rounded-lg border border-line bg-app-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-fg-primary">
            {company.role ?? 'Open role'}
          </h3>
          <p className="mt-1 text-sm text-fg-secondary">
            {company.company_name ?? 'Company'} · {company.industry ?? 'Industry'}{' '}
            · {company.size ?? 'Team size'}
          </p>
        </div>
        <MatchBadge match={match} />
      </div>

      {company.pitch && (
        <p className="mt-3 text-sm italic text-fg-primary">
          &ldquo;{company.pitch}&rdquo;
        </p>
      )}

      {match.matched_skills.length > 0 && (
        <p className="mt-3 text-xs text-teal">
          Skills match: {match.matched_skills.map((s) => `${s} ✓`).join('  ')}
        </p>
      )}

      {match.missing_skills.length > 0 && (
        <p className="mt-2 text-xs text-fg-tertiary">
          Gaps vs role: {match.missing_skills.join(', ')}
        </p>
      )}

      <MatchBreakdown match={match} />

      {!profile?.skills?.length && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Add skills to your profile for better match scoring.
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
