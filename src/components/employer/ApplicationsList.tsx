import type { CandidateApplication, Profile, Session } from '../../lib/types';
import { ApplicationRow } from './ApplicationRow';

interface ApplicationsListProps {
  applications: (CandidateApplication & { candidate?: Profile })[];
  sessions: Session[];
}

export function ApplicationsList({
  applications,
  sessions,
}: ApplicationsListProps) {
  if (applications.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-secondary">
        No applications yet. Publish a role to start receiving candidates.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const session = sessions.find((s) => s.id === app.session_id);
        const agentName = session?.agent_persona?.name ?? 'Agent';
        return (
          <ApplicationRow
            key={app.id}
            application={app}
            agentName={agentName}
          />
        );
      })}
    </div>
  );
}
