import { useState } from 'react';
import type { ApplicantPoolEntry } from '../../lib/matching';
import { GOOD_MATCH_THRESHOLD } from '../../lib/matching';
import { sendCandidateOutreach } from '../../lib/api';
import { CandidateSummaryCard } from '../shared/CandidateSummaryCard';
import { MatchBadge } from '../shared/MatchBadge';
import { MatchBreakdown } from '../shared/MatchBreakdown';

interface ApplicantRowProps {
  entry: ApplicantPoolEntry;
  sessionId: string;
  agentName?: string;
  onOutreachSent?: (candidateId: string, outreach: ApplicantPoolEntry['outreach']) => void;
}

export function ApplicantRow({
  entry,
  sessionId,
  agentName,
  onOutreachSent,
}: ApplicantRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showOutreach, setShowOutreach] = useState(false);
  const [sending, setSending] = useState(false);
  const [outreachError, setOutreachError] = useState<string | null>(null);
  const { candidate, match, application, kind, outreach } = entry;
  const summary = application?.candidate_summary;
  const hasSummary =
    summary &&
    typeof summary === 'object' &&
    'interest_level' in summary &&
    summary.interest_level;

  const scorePct = hasSummary
    ? Math.round((summary.engagement_score ?? 0) * 100)
    : null;

  const canOutreach =
    kind === 'suggested' &&
    match.score >= GOOD_MATCH_THRESHOLD &&
    !outreach?.message;

  const handleOutreach = async () => {
    setSending(true);
    setOutreachError(null);
    try {
      const result = await sendCandidateOutreach(sessionId, candidate.id, match);
      onOutreachSent?.(candidate.id, result.outreach);
      setShowOutreach(true);
    } catch (err) {
      setOutreachError(err instanceof Error ? err.message : 'Outreach failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-fg-primary">
              {candidate.full_name ?? 'Candidate'} ·{' '}
              {candidate.current_role ?? 'Applicant'}
            </p>
            <MatchBadge match={match} />
            {kind === 'suggested' && (
              <span className="rounded-full border border-teal/40 bg-teal/10 px-2 py-0.5 text-xs text-teal">
                Potential match
              </span>
            )}
            {kind === 'applied' && (
              <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-xs text-coral">
                Applied
              </span>
            )}
            {outreach?.message && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                Outreach sent
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {kind === 'applied' && application
              ? `Applied ${new Date(application.created_at).toLocaleDateString()} · ${application.status.replace(/_/g, ' ')}`
              : outreach?.message
                ? `Outreach sent ${outreach.sent_at ? new Date(outreach.sent_at).toLocaleDateString() : ''} · preview only`
                : 'Has not applied yet — strong profile fit for this role'}
            {scorePct !== null && ` · Interest: ${scorePct}%`}
          </p>
          {match.matched_skills.length > 0 && (
            <p className="mt-2 text-xs text-teal">
              Profile fit: {match.matched_skills.slice(0, 5).join(', ')}
              {match.matched_skills.length > 5 ? '…' : ''}
            </p>
          )}
          <MatchBreakdown match={match} />
        </div>
        <div className="flex flex-wrap gap-2">
          {canOutreach && (
            <button
              type="button"
              onClick={() => void handleOutreach()}
              disabled={sending}
              className="rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-dark disabled:opacity-50"
            >
              {sending ? 'Generating...' : 'Send outreach'}
            </button>
          )}
          {outreach?.message && (
            <button
              type="button"
              onClick={() => setShowOutreach((v) => !v)}
              className="rounded-md border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-teal hover:text-teal"
            >
              {showOutreach ? 'Hide outreach' : 'View outreach'}
            </button>
          )}
          {hasSummary && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-teal hover:text-teal"
            >
              {expanded ? 'Hide summary' : 'View summary'}
            </button>
          )}
        </div>
      </div>

      {outreachError && (
        <p className="mt-3 text-xs text-err">{outreachError}</p>
      )}

      {showOutreach && outreach?.message && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Agent outreach preview (not sent externally)
          </p>
          <p className="mt-2 text-sm text-fg-primary">{outreach.message}</p>
        </div>
      )}

      {expanded && hasSummary && summary && (
        <div className="mt-4">
          <CandidateSummaryCard summary={summary} agentName={agentName} />
        </div>
      )}
    </div>
  );
}
