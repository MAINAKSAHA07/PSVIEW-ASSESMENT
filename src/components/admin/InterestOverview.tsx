import type { CandidateApplication, Profile, Session } from '../../lib/types';

interface InterestOverviewProps {
  applications: (CandidateApplication & {
    candidate?: Profile;
    session?: Session;
  })[];
  avgInterest: number;
}

export function InterestOverview({
  applications,
  avgInterest,
}: InterestOverviewProps) {
  const withSummary = applications.filter(
    (app) =>
      app.candidate_summary &&
      typeof app.candidate_summary === 'object' &&
      'interest_level' in app.candidate_summary &&
      app.candidate_summary.interest_level,
  );

  const buckets = {
    high: withSummary.filter((a) => a.candidate_summary.interest_level === 'high'),
    medium: withSummary.filter(
      (a) => a.candidate_summary.interest_level === 'medium',
    ),
    low: withSummary.filter((a) => a.candidate_summary.interest_level === 'low'),
    declined: withSummary.filter(
      (a) => a.candidate_summary.interest_level === 'declined',
    ),
  };

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="text-sm font-medium text-fg-primary">Average interest</h3>
      <p className="mt-1 text-xs text-fg-secondary">
        Engagement scores from completed candidate conversations.
      </p>

      <p className="mt-4 text-3xl font-medium text-fg-primary">{avgInterest}%</p>
      <p className="text-xs text-fg-tertiary">
        Based on {withSummary.length} summarized conversation
        {withSummary.length === 1 ? '' : 's'}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['High', buckets.high.length, 'text-teal'],
            ['Medium', buckets.medium.length, 'text-fg-primary'],
            ['Low', buckets.low.length, 'text-amber-600'],
            ['Declined', buckets.declined.length, 'text-err'],
          ] as const
        ).map(([label, count, colorClass]) => (
          <div
            key={label}
            className="rounded-md border border-line/60 px-3 py-2 text-center"
          >
            <p className={`text-lg font-medium ${colorClass}`}>{count}</p>
            <p className="text-xs text-fg-secondary">{label}</p>
          </div>
        ))}
      </div>

      {withSummary.length > 0 && (
        <ul className="mt-5 space-y-2">
          {withSummary.slice(0, 8).map((app) => (
            <li
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="text-fg-primary">
                {app.candidate?.full_name ?? 'Candidate'} →{' '}
                {app.session?.company_profile?.role ?? 'Role'}
              </span>
              <span className="text-xs text-fg-secondary">
                {Math.round((app.candidate_summary.engagement_score ?? 0) * 100)}% ·{' '}
                {app.candidate_summary.interest_level}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
