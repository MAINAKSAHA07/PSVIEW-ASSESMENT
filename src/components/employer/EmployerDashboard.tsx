import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEmployerApplications, fetchEmployerAgentSessions } from '../../lib/api';
import { useAuthContext } from '../../context/AuthContext';
import type { CandidateApplication, Profile, Session } from '../../lib/types';
import { AgentCard } from './AgentCard';
import { ApplicationsList } from './ApplicationsList';

export function EmployerDashboard() {
  const { user } = useAuthContext();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [applications, setApplications] = useState<
    (CandidateApplication & { candidate?: Profile })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchEmployerAgentSessions(user.id),
      fetchEmployerApplications(user.id),
    ])
      .then(([sess, apps]) => {
        setSessions(sess as Session[]);
        setApplications(apps);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard'),
      )
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl flex-1 overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-fg-primary">Your agents</h1>
        <Link
          to="/app?new=1"
          className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
        >
          Configure new agent
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-err">{error}</p>}

      <div className="mb-8 space-y-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-fg-secondary">No agents configured yet.</p>
        ) : (
          sessions.map((session) => (
            <AgentCard key={session.id} session={session} />
          ))
        )}
      </div>

      <h2 className="mb-4 font-serif text-xl text-fg-primary">Applications</h2>
      <ApplicationsList applications={applications} sessions={sessions} />
    </div>
  );
}
