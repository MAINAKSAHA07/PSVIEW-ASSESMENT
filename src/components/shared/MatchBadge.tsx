import type { MatchTier, RoleMatch } from '../../lib/types';
import { MATCH_TIER_LABELS } from '../../lib/matching';

const TIER_STYLES: Record<MatchTier, string> = {
  strong: 'bg-teal/15 text-teal border-teal/30',
  good: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
  partial: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  weak: 'bg-app-secondary text-fg-tertiary border-line',
};

interface MatchBadgeProps {
  match: RoleMatch;
  showScore?: boolean;
}

export function MatchBadge({ match, showScore = true }: MatchBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TIER_STYLES[match.tier]}`}
    >
      {MATCH_TIER_LABELS[match.tier]}
      {showScore && <span className="opacity-80">· {match.score}%</span>}
    </span>
  );
}

interface MatchFilterTabsProps {
  value: MatchTier | 'all';
  onChange: (value: MatchTier | 'all') => void;
  counts: Record<MatchTier | 'all', number>;
}

const FILTER_OPTIONS: { value: MatchTier | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'strong', label: 'Strong' },
  { value: 'good', label: 'Good' },
  { value: 'partial', label: 'Partial' },
  { value: 'weak', label: 'Weak' },
];

export function MatchFilterTabs({
  value,
  onChange,
  counts,
}: MatchFilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            value === opt.value
              ? 'border-teal bg-teal/10 text-teal'
              : 'border-line text-fg-secondary hover:border-teal/50 hover:text-fg-primary'
          }`}
        >
          {opt.label} ({counts[opt.value]})
        </button>
      ))}
    </div>
  );
}
