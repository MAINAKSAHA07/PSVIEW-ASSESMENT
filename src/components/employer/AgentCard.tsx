import { Link } from 'react-router-dom';
import type { Session } from '../../lib/types';

interface AgentCardProps {
  session: Session;
  onSelect?: (sessionId: string) => void;
}

export function AgentCard({ session, onSelect }: AgentCardProps) {
  const profile = session.company_profile ?? {};
  const persona = session.agent_persona ?? {};
  const published = session.is_published ?? false;

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-fg-primary">
            {profile.role ?? 'Role'} · {profile.company_name ?? 'Company'}
          </p>
          <p className="mt-1 text-sm text-fg-secondary">
            Agent: {persona.name ?? 'Unnamed'} ·{' '}
            {published ? 'Published' : 'Draft'} ·{' '}
            {session.application_count ?? 0} applications
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            published
              ? 'bg-teal/10 text-teal'
              : 'bg-app-raised text-fg-tertiary'
          }`}
        >
          {session.status}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(session.id)}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-coral hover:text-coral"
          >
            Open session
          </button>
        )}
        <Link
          to="/app/dashboard"
          className="rounded-md border border-line px-3 py-1.5 text-xs text-fg-secondary hover:border-teal hover:text-teal"
        >
          View applications
        </Link>
      </div>
    </div>
  );
}
