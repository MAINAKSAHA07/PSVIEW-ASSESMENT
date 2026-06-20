import type { Session } from '../../lib/types';

interface ConversationListProps {
  sessions: Session[];
}

export function ConversationList({ sessions }: ConversationListProps) {
  const simulating = sessions.filter((s) => s.status === 'simulating');

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="text-sm font-medium text-fg-primary">Conversations</h3>
      <p className="mt-1 text-xs text-fg-secondary">
        All agent sessions and simulation conversations on the platform.
      </p>
      <ul className="mt-4 space-y-2">
        {sessions.length === 0 ? (
          <li className="text-sm text-fg-secondary">No sessions yet.</li>
        ) : (
          sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/60 px-3 py-2 text-sm"
            >
              <div>
                <p className="text-fg-primary">
                  {session.company_profile?.company_name ?? 'Company'} ·{' '}
                  {session.company_profile?.role ?? session.status}
                </p>
                <p className="text-xs text-fg-tertiary">
                  Updated {new Date(session.updated_at).toLocaleString()}
                </p>
              </div>
              <span className="text-xs capitalize text-fg-secondary">
                {session.status.replace('_', ' ')}
                {session.parent_session_id ? ' · candidate chat' : ''}
              </span>
            </li>
          ))
        )}
      </ul>
      <p className="mt-4 text-xs text-fg-tertiary">
        {simulating.length} active simulation
        {simulating.length === 1 ? '' : 's'} right now.
      </p>
    </div>
  );
}
