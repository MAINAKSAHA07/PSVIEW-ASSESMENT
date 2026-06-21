import { useEffect, useMemo, useState } from 'react';
import { fetchSessionApplicantPool } from '../../lib/api';
import { GOOD_MATCH_THRESHOLD } from '../../lib/matching';
import type { ApplicantPoolEntry } from '../../lib/matching';
import type { Session } from '../../lib/types';
import { ApplicantRow } from './ApplicantRow';

interface SessionApplicantsListProps {
  session: Session;
}

export function SessionApplicantsList({ session }: SessionApplicantsListProps) {
  const [entries, setEntries] = useState<ApplicantPoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchSessionApplicantPool(session)
      .then((pool) => {
        if (!cancelled) setEntries(pool);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load applicants');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session.id]);

  const counts = useMemo(() => {
    const applied = entries.filter((e) => e.kind === 'applied').length;
    const suggested = entries.filter((e) => e.kind === 'suggested').length;
    return { applied, suggested, total: entries.length };
  }, [entries]);

  const agentName = session.agent_persona?.name ?? 'Agent';
  const roleTitle = session.company_profile?.role ?? 'Role';
  const companyName = session.company_profile?.company_name ?? 'Company';

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-err">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-app-card p-4">
        <p className="font-medium text-fg-primary">
          {roleTitle} · {companyName}
        </p>
        <p className="mt-1 text-xs text-fg-secondary">
          Showing everyone who applied plus potential matches at {GOOD_MATCH_THRESHOLD}%+ (
          {counts.applied} applied · {counts.suggested} suggested · {counts.total} total)
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-secondary">
          No applicants yet and no candidates at {GOOD_MATCH_THRESHOLD}%+ match. Publish this
          role and encourage candidates to upload resumes for better matching.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <ApplicantRow
              key={entry.application?.id ?? entry.candidate.id}
              entry={entry}
              agentName={agentName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
