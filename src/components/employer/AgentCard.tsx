import { Link } from 'react-router-dom';
import type { Session, SessionStatus } from '../../lib/types';
import { isProfileReady } from '../../lib/constants';
import { isEmptyAgentSession } from '../../lib/sessionUtils';

interface AgentCardProps {
  session: Session;
  onDelete?: (sessionId: string) => void;
  deleting?: boolean;
}

function formatLabel(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  const trimmed = value.trim();
  if (trimmed.length <= 72) return trimmed;
  return `${trimmed.slice(0, 69)}...`;
}

function statusLabel(status: SessionStatus): string {
  switch (status) {
    case 'configuring':
      return 'Configuring';
    case 'synthesizing':
      return 'Synthesizing';
    case 'ready':
      return 'Ready';
    case 'simulating':
      return 'Simulating';
    default:
      return status;
  }
}

function statusClass(status: SessionStatus): string {
  switch (status) {
    case 'configuring':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
    case 'synthesizing':
      return 'bg-coral/10 text-coral';
    case 'ready':
      return 'bg-teal/10 text-teal';
    case 'simulating':
      return 'bg-app-raised text-fg-secondary';
    default:
      return 'bg-app-raised text-fg-tertiary';
  }
}

function continueLabel(session: Session): string {
  if (session.status === 'ready') return 'View agent';
  if (session.status === 'simulating') return 'Open simulation';
  if (session.status === 'synthesizing') return 'Continue synthesis';
  if (isProfileReady(session.company_profile ?? {})) return 'Generate agent';
  return 'Continue setup';
}

export function AgentCard({ session, onDelete, deleting }: AgentCardProps) {
  const profile = session.company_profile ?? {};
  const persona = session.agent_persona ?? {};
  const published = session.is_published ?? false;
  const roleTitle = formatLabel(profile.role, 'Role');
  const companyName = formatLabel(profile.company_name, 'Company');
  const hasProfileData = Boolean(
    profile.company_name || profile.role || profile.pitch,
  );
  const canDelete = isEmptyAgentSession(session);

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg-primary">
            {roleTitle} · {companyName}
          </p>
          <p className="mt-1 text-sm text-fg-secondary">
            Agent: {persona.name ?? 'Unnamed'} ·{' '}
            {published ? 'Published' : 'Draft'} ·{' '}
            {session.application_count ?? 0} applications
          </p>
          {!hasProfileData && session.status === 'configuring' && (
            <p className="mt-2 text-xs text-fg-tertiary">
              No company details yet — open to upload a file or chat.
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusClass(session.status)}`}
        >
          {statusLabel(session.status)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/app?session=${session.id}`}
          className="rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-dark"
        >
          {continueLabel(session)}
        </Link>
        <Link
          to={`/app/dashboard?session=${session.id}`}
          className="rounded-md border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-teal hover:text-teal"
        >
          View applications
        </Link>
        {canDelete && onDelete && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(session.id)}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-err hover:text-err disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}
