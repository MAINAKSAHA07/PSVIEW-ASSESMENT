import { useState } from 'react';
import type { CandidateApplication, Profile } from '../../lib/types';
import { CandidateSummaryCard } from '../shared/CandidateSummaryCard';

interface ApplicationRowProps {
  application: CandidateApplication & { candidate?: Profile };
  agentName?: string;
}

export function ApplicationRow({ application, agentName }: ApplicationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const candidate = application.candidate;
  const summary = application.candidate_summary;
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
        <div>
          <p className="font-medium text-fg-primary">
            {candidate?.full_name ?? 'Candidate'} ·{' '}
            {candidate?.current_role ?? 'Applicant'}
          </p>
          <p className="mt-1 text-sm text-fg-secondary">
            Applied {new Date(application.created_at).toLocaleDateString()} ·{' '}
            {application.status.replace('_', ' ')}
            {scorePct !== null && ` · Interest: ${scorePct}%`}
          </p>
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
      {expanded && hasSummary && (
        <div className="mt-4">
          <CandidateSummaryCard summary={summary} agentName={agentName} />
        </div>
      )}
    </div>
  );
}
