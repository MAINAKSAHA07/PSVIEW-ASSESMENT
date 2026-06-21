import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchSessionApplicantPool,
  sendBulkCandidateOutreach,
} from '../../lib/api';
import { GOOD_MATCH_THRESHOLD } from '../../lib/matching';
import type { ApplicantPoolEntry } from '../../lib/matching';
import type { CandidateOutreach, Session } from '../../lib/types';
import { ApplicantRow } from './ApplicantRow';

interface SessionApplicantsListProps {
  session: Session;
}

export function SessionApplicantsList({ session }: SessionApplicantsListProps) {
  const [entries, setEntries] = useState<ApplicantPoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const loadPool = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchSessionApplicantPool(session)
      .then(setEntries)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load applicants');
      })
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  const counts = useMemo(() => {
    const applied = entries.filter((e) => e.kind === 'applied').length;
    const suggested = entries.filter((e) => e.kind === 'suggested').length;
    const outreachSent = entries.filter((e) => e.outreach?.message).length;
    return { applied, suggested, total: entries.length, outreachSent };
  }, [entries]);

  const outreachCandidates = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.kind === 'suggested' &&
          e.match.score >= GOOD_MATCH_THRESHOLD &&
          !e.outreach?.message,
      ),
    [entries],
  );

  const agentName = session.agent_persona?.name ?? 'Agent';
  const roleTitle = session.company_profile?.role ?? 'Role';
  const companyName = session.company_profile?.company_name ?? 'Company';

  const handleOutreachSent = (candidateId: string, outreach: CandidateOutreach | null | undefined) => {
    if (!outreach) return;
    setEntries((prev) =>
      prev.map((entry) =>
        entry.candidate.id === candidateId ? { ...entry, outreach } : entry,
      ),
    );
  };

  const handleBulkOutreach = async () => {
    if (outreachCandidates.length === 0) return;
    setBulkSending(true);
    setBulkResult(null);
    setError(null);
    try {
      const result = await sendBulkCandidateOutreach(
        session.id,
        outreachCandidates.map((e) => ({
          candidateId: e.candidate.id,
          matchScore: e.match,
        })),
      );
      setBulkResult(
        `Generated ${result.sent} outreach message${result.sent === 1 ? '' : 's'} (${result.skipped} skipped). Preview only, nothing sent externally.`,
      );
      await loadPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk outreach failed');
    } finally {
      setBulkSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return <p className="text-sm text-err">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-app-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-fg-primary">
              {roleTitle} · {companyName}
            </p>
            <p className="mt-1 text-xs text-fg-secondary">
              Applied candidates plus {GOOD_MATCH_THRESHOLD}%+ matches · {counts.applied}{' '}
              applied · {counts.suggested} suggested · {counts.outreachSent} outreach sent
            </p>
          </div>
          {outreachCandidates.length > 0 && (
            <button
              type="button"
              onClick={() => void handleBulkOutreach()}
              disabled={bulkSending}
              className="shrink-0 rounded-lg bg-coral px-4 py-2 text-xs font-medium text-white hover:bg-coral-dark disabled:opacity-50"
            >
              {bulkSending
                ? 'Generating outreach...'
                : `Outreach ${outreachCandidates.length} match${outreachCandidates.length === 1 ? '' : 'es'} (${GOOD_MATCH_THRESHOLD}%+)`}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-fg-tertiary">
          Outreach uses your agent persona to draft personalized opening messages. Preview
          only, no email or LinkedIn is sent.
        </p>
      </div>

      {bulkResult && (
        <p className="rounded-lg border border-teal/30 bg-teal/10 px-4 py-2 text-xs text-teal">
          {bulkResult}
        </p>
      )}
      {error && (
        <p className="text-sm text-err">{error}</p>
      )}

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-secondary">
          No applicants yet and no candidates at {GOOD_MATCH_THRESHOLD}%+ match.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <ApplicantRow
              key={entry.application?.id ?? entry.candidate.id}
              entry={entry}
              sessionId={session.id}
              agentName={agentName}
              onOutreachSent={handleOutreachSent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
