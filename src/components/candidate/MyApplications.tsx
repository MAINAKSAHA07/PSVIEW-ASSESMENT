import { useEffect, useState } from 'react';
import { fetchCandidateApplications } from '../../lib/api';
import { useAuthContext } from '../../context/AuthContext';
import type { CandidateApplication, Session } from '../../lib/types';

export function MyApplications() {
  const { user } = useAuthContext();
  const [applications, setApplications] = useState<
    (CandidateApplication & { session?: Session })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchCandidateApplications(user.id)
      .then(setApplications)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-fg-secondary">
        No applications yet. Browse roles to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-serif text-xl text-fg-primary">My applications</h2>
      {applications.map((app) => {
        const session = app.session;
        const company = session?.company_profile;
        return (
          <div
            key={app.id}
            className="rounded-lg border border-line bg-app-card p-4"
          >
            <p className="font-medium text-fg-primary">
              {company?.role ?? 'Role'} at {company?.company_name ?? 'Company'}
            </p>
            <p className="mt-1 text-sm text-fg-secondary">
              Applied {new Date(app.created_at).toLocaleDateString()} ·{' '}
              {app.status.replace('_', ' ')}
            </p>
          </div>
        );
      })}
    </div>
  );
}
