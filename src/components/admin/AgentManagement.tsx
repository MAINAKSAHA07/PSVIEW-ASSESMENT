import type { Session } from '../../lib/types';

interface AgentManagementProps {
  sessions: Session[];
}

export function AgentManagement({ sessions }: AgentManagementProps) {
  const agents = sessions.filter((s) => s.agent_persona?.name);

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="text-sm font-medium text-fg-primary">Active agents</h3>
      <p className="mt-1 text-xs text-fg-secondary">
        Published and draft recruiting agents across the platform.
      </p>
      <ul className="mt-4 space-y-2">
        {agents.length === 0 ? (
          <li className="text-sm text-fg-secondary">No agents configured yet.</li>
        ) : (
          agents.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/60 px-3 py-2 text-sm"
            >
              <div>
                <p className="text-fg-primary">
                  {session.agent_persona.name} ·{' '}
                  {session.company_profile?.role ?? 'Role'}
                </p>
                <p className="text-xs text-fg-tertiary">
                  {session.company_profile?.company_name ?? 'Company'}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  session.is_published
                    ? 'bg-teal/10 text-teal'
                    : 'bg-app-raised text-fg-secondary'
                }`}
              >
                {session.is_published ? 'Published' : 'Draft'}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
