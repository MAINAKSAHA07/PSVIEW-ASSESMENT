export interface ActivityFeedProps {
  sessions: Array<{
    id: string;
    created_at: string;
    is_published?: boolean;
    company_profile?: { company_name?: string; role?: string };
    agent_persona?: { name?: string };
  }>;
  applications: Array<{
    id: string;
    created_at: string;
    status: string;
    candidate?: { full_name?: string; current_role?: string };
  }>;
}

export function ActivityFeed({ sessions, applications }: ActivityFeedProps) {
  const events = [
    ...sessions.map((s) => ({
      id: `s-${s.id}`,
      time: s.created_at,
      text: s.is_published
        ? `${s.company_profile?.company_name ?? 'Company'} published "${s.company_profile?.role ?? 'role'}"`
        : `${s.company_profile?.company_name ?? 'Company'} configured agent "${s.agent_persona?.name ?? 'Agent'}"`,
    })),
    ...applications.map((a) => ({
      id: `a-${a.id}`,
      time: a.created_at,
      text: `${a.candidate?.full_name ?? 'Candidate'} applied (${a.status.replace('_', ' ')})`,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="mb-3 text-sm font-medium text-fg-primary">Recent activity</h3>
      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id} className="text-sm text-fg-secondary">
            {event.text}{' '}
            <span className="text-xs text-fg-tertiary">
              {new Date(event.time).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
