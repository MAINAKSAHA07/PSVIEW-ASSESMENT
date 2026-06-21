import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  deleteEmployerSession,
  fetchEmployerApplications,
  fetchEmployerAgentSessions,
} from '../../lib/api';
import { useAuthContext } from '../../context/AuthContext';
import type { CandidateApplication, Profile, Session } from '../../lib/types';
import { AgentCard } from './AgentCard';
import { ApplicationsList } from './ApplicationsList';
import { SessionApplicantsList } from './SessionApplicantsList';

export function EmployerDashboard() {
  const { user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSessionId = searchParams.get('session');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [applications, setApplications] = useState<
    (CandidateApplication & { candidate?: Profile })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!user) return Promise.resolve();
    setLoading(true);
    setError(null);
    return Promise.all([
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    setError(null);
    try {
      await deleteEmployerSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-serif text-xl text-fg-primary sm:text-2xl">
            {selectedSession ? 'Role applicants' : 'Your agents'}
          </h1>
          <Link
            to="/app?new=1"
            className="inline-flex justify-center rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
          >
            Configure new agent
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-err">{error}</p>}

        {selectedSession && (
          <div className="mb-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-xl text-fg-primary">Applicants for this role</h2>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="text-xs text-fg-secondary hover:text-teal"
              >
                ← All agents
              </button>
            </div>
            <SessionApplicantsList session={selectedSession} />
          </div>
        )}

        <div className={`space-y-3 ${selectedSession ? 'mt-8 border-t border-line pt-8' : 'mb-8'}`}>
          {selectedSession && (
            <h2 className="font-serif text-lg text-fg-primary">Your agents</h2>
          )}
          {sessions.length === 0 ? (
            <p className="text-sm text-fg-secondary">No agents configured yet.</p>
          ) : (
            sessions.map((session) => (
              <AgentCard
                key={session.id}
                session={session}
                onDelete={handleDelete}
                deleting={deletingId === session.id}
              />
            ))
          )}
        </div>

        {!selectedSession && (
          <>
            <h2 className="mb-2 font-serif text-xl text-fg-primary">Applications</h2>
            <p className="mb-4 text-sm text-fg-secondary">
              Open an agent above and click <span className="text-fg-primary">View applications</span>{' '}
              to see who applied and potential matches at 75%+.
            </p>
            <ApplicationsList applications={applications} sessions={sessions} />
          </>
        )}
      </div>
    </div>
  );
}
