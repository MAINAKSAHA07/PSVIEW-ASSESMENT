import { useState } from 'react';
import type { ApplicantPoolEntry } from '../../lib/matching';
import { CandidateSummaryCard } from '../shared/CandidateSummaryCard';
import { MatchBadge } from '../shared/MatchBadge';
import { MatchBreakdown } from '../shared/MatchBreakdown';

interface ApplicantRowProps {
  entry: ApplicantPoolEntry;
  agentName?: string;
}

export function ApplicantRow({ entry, agentName }: ApplicantRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { candidate, match, application, kind } = entry;
  const summary = application?.candidate_summary;
  const hasSummary =
    summary &&
    typeof summary === 'object' &&
    'interest_level' in summary &&
    summary.interest_level;

  const scorePct = hasSummary
    ? Math.round((summary.engagement_score ?? 0) * 100)
    : null;

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
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {kind === 'applied' && application
              ? `Applied ${new Date(application.created_at).toLocaleDateString()} · ${application.status.replace(/_/g, ' ')}`
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
        <div className="flex gap-2">
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
      {expanded && hasSummary && summary && (
        <div className="mt-4">
          <CandidateSummaryCard summary={summary} agentName={agentName} />
        </div>
      )}
    </div>
  );
}
