import { useMemo, useState } from 'react';
import { computeRoleMatch } from '../../lib/matching';
import type { CandidateApplication, MatchTier, Profile, Session } from '../../lib/types';
import { MatchFilterTabs } from '../shared/MatchBadge';
import { ApplicationRow } from './ApplicationRow';

interface ApplicationsListProps {
  applications: (CandidateApplication & { candidate?: Profile })[];
  sessions: Session[];
}

export function ApplicationsList({
  applications,
  sessions,
}: ApplicationsListProps) {
  const [filter, setFilter] = useState<MatchTier | 'all'>('all');

  const applicationsWithMatch = useMemo(
    () =>
      applications
        .map((app) => {
          const session = sessions.find((s) => s.id === app.session_id);
          const match =
            app.candidate && session
              ? computeRoleMatch(app.candidate, session)
              : app.match_score ?? null;
          return { app, session, match };
        })
        .sort(
          (a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0),
        ),
    [applications, sessions],
  );

  const counts = useMemo(() => {
    const next: Record<MatchTier | 'all', number> = {
      all: applicationsWithMatch.length,
      strong: 0,
      good: 0,
      partial: 0,
      weak: 0,
    };
    for (const item of applicationsWithMatch) {
      if (item.match) next[item.match.tier] += 1;
    }
    return next;
  }, [applicationsWithMatch]);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? applicationsWithMatch
        : applicationsWithMatch.filter((item) => item.match?.tier === filter),
    [applicationsWithMatch, filter],
  );

  if (applications.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-secondary">
        No applications yet. Publish a role to start receiving candidates.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <MatchFilterTabs value={filter} onChange={setFilter} counts={counts} />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-secondary">
          No applicants in this match category.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ app, match }) => {
            const session = sessions.find((s) => s.id === app.session_id);
            const agentName = session?.agent_persona?.name ?? 'Agent';
            return (
              <ApplicationRow
                key={app.id}
                application={app}
                match={match}
                agentName={agentName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
