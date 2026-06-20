import { useState } from 'react';
import type { RoleMatch } from '../../lib/types';
import { MATCH_TIER_LABELS } from '../../lib/matching';
import { MatchBadge } from './MatchBadge';

interface MatchBreakdownProps {
  match: RoleMatch;
}

export function MatchBreakdown({ match }: MatchBreakdownProps) {
  const [open, setOpen] = useState(false);

  if (match.score <= 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-line/70 bg-app-secondary/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-fg-secondary hover:text-fg-primary"
      >
        <span>How we matched you ({match.score}% · {MATCH_TIER_LABELS[match.tier]})</span>
        <span className="text-fg-tertiary">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line/60 px-3 py-3 text-xs">
          <div className="flex items-center gap-2">
            <MatchBadge match={match} />
            <span className="text-fg-secondary">
              Weighted score from tech stack overlap, role fit, experience, and full-stack alignment.
            </span>
          </div>

          {match.highlights.length > 0 && (
            <div>
              <p className="font-medium text-fg-primary">Score drivers</p>
              <ul className="mt-1 space-y-1 text-fg-secondary">
                {match.highlights.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {match.matched_skills.length > 0 && (
            <div>
              <p className="font-medium text-teal">Skills that matched</p>
              <p className="mt-1 text-fg-secondary">
                {match.matched_skills.join(', ')}
              </p>
            </div>
          )}

          {match.missing_skills.length > 0 && (
            <div>
              <p className="font-medium text-fg-tertiary">Gaps vs role stack</p>
              <p className="mt-1 text-fg-secondary">
                {match.missing_skills.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
