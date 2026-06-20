import type { Session } from './types';

export function isEmptyAgentSession(session: Session): boolean {
  const profile = session.company_profile ?? {};
  const hasProfileData = Boolean(
    profile.company_name || profile.role || profile.pitch,
  );
  const hasAgent = Boolean(session.agent_persona?.name);

  return (
    session.status === 'configuring' &&
    !hasProfileData &&
    !hasAgent &&
    (session.application_count ?? 0) === 0 &&
    !session.is_published
  );
}
