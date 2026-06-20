import { useEffect, useState } from 'react';
import { fetchPublishedSessions } from '../../lib/api';
import { useProfileContext } from '../../context/ProfileContext';
import type { Session } from '../../lib/types';
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

  useEffect(() => {
    fetchPublishedSessions()
      .then(setRoles)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load roles'),
      )
      .finally(() => setLoading(false));
  }, []);

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
      <h2 className="font-serif text-xl text-fg-primary">
        Open roles matching your profile
      </h2>
      {roles.map((session) => (
        <RoleCard
          key={session.id}
          session={session}
          profile={profile}
          onTalk={onTalk}
          loading={startingId === session.id}
        />
      ))}
    </div>
  );
}
