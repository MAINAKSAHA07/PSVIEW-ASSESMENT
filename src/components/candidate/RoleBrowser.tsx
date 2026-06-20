import { useEffect, useMemo, useState } from 'react';
import { fetchPublishedSessions } from '../../lib/api';
import { computeRoleMatch } from '../../lib/matching';
import { useProfileContext } from '../../context/ProfileContext';
import type { MatchTier, Session } from '../../lib/types';
import { MatchFilterTabs } from '../shared/MatchBadge';
import { RoleCard } from './RoleCard';

interface RoleBrowserProps {
  onTalk: (sessionId: string) => void;
  startingId?: string | null;
}

export function RoleBrowser({ onTalk, startingId }: RoleBrowserProps) {
  const { profile } = useProfileContext();
  const [roles, setRoles] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatchTier | 'all'>('all');

  useEffect(() => {
    fetchPublishedSessions()
      .then(setRoles)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load roles'),
      )
      .finally(() => setLoading(false));
  }, []);

  const rolesWithMatch = useMemo(
    () =>
      roles
        .map((session) => ({
          session,
          match: computeRoleMatch(profile, session),
        }))
        .sort((a, b) => b.match.score - a.match.score),
    [roles, profile],
  );

  const counts = useMemo(() => {
    const next: Record<MatchTier | 'all', number> = {
      all: rolesWithMatch.length,
      strong: 0,
      good: 0,
      partial: 0,
      weak: 0,
    };
    for (const item of rolesWithMatch) {
      next[item.match.tier] += 1;
    }
    return next;
  }, [rolesWithMatch]);

  const filteredRoles = useMemo(
    () =>
      filter === 'all'
        ? rolesWithMatch
        : rolesWithMatch.filter((item) => item.match.tier === filter),
    [filter, rolesWithMatch],
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-sm text-err">{error}</p>;
  }

  if (roles.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-fg-secondary">
        No published roles yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-fg-primary">
            Open roles matching your profile
          </h2>
          <p className="mt-1 text-sm text-fg-secondary">
            Sorted by fit. Filter by match strength before you apply.
          </p>
        </div>
      </div>

      <MatchFilterTabs value={filter} onChange={setFilter} counts={counts} />

      {filteredRoles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-secondary">
          No roles in this match category. Try another filter.
        </p>
      ) : (
        filteredRoles.map(({ session, match }) => (
          <RoleCard
            key={session.id}
            session={session}
            profile={profile}
            match={match}
            onTalk={onTalk}
            loading={startingId === session.id}
          />
        ))
      )}
    </div>
  );
}
