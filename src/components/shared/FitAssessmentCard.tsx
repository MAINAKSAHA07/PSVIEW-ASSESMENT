import type { RoleMatch } from '../../lib/types';
import { getFitVerdict } from '../../lib/matching';
import { MatchBadge } from './MatchBadge';
import { MatchBreakdown } from './MatchBreakdown';

interface FitAssessmentCardProps {
  match: RoleMatch;
  compact?: boolean;
}

const VERDICT_STYLES = {
  good: 'border-teal/30 bg-teal/5',
  caution: 'border-amber-500/30 bg-amber-500/5',
  weak: 'border-line bg-app-secondary/40',
};

export function FitAssessmentCard({ match, compact = false }: FitAssessmentCardProps) {
  const verdict = getFitVerdict(match);
  const styleKey = verdict.isGoodFit
    ? 'good'
    : match.tier === 'partial'
      ? 'caution'
      : 'weak';

  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${VERDICT_STYLES[styleKey]}`}
      >
        <p className="text-xs text-fg-primary">{verdict.headline}</p>
        <MatchBadge match={match} />
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${VERDICT_STYLES[styleKey]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg-primary">{verdict.headline}</p>
          <p className="mt-1 text-xs text-fg-secondary">{verdict.detail}</p>
        </div>
        <MatchBadge match={match} />
      </div>
      <MatchBreakdown match={match} />
    </div>
  );
}
