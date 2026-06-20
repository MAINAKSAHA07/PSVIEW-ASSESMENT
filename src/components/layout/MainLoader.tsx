import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import { fetchMessages, insertMessage } from '../../lib/api';
import { getOpeningMessage } from '../../lib/constants';
import { useSessionContext } from '../../context/SessionContext';
import type { Session } from '../../lib/types';

export function MainLoader() {
  const { firstName, user } = useAuth();
  const { startNewSession } = useSession();
  const { session, setMessages } = useSessionContext();
  const creatingRef = useRef(false);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function init() {
      let activeSession = session as Session | null;

      if (!activeSession) {
        if (creatingRef.current) return;
        creatingRef.current = true;
        try {
          activeSession = (await startNewSession()) as Session | null;
        } finally {
          creatingRef.current = false;
        }
      }

      if (cancelled || !activeSession) return;
      if (hydratedRef.current === activeSession.id) return;

      const dbMessages = await fetchMessages(activeSession.id, 'config');
      if (cancelled) return;

      hydratedRef.current = activeSession.id;

      if (dbMessages.length > 0) {
        setMessages(dbMessages);
        return;
      }

      try {
        const saved = await insertMessage({
          session_id: activeSession.id,
          phase: 'config',
          role: 'agent',
          content: getOpeningMessage(firstName),
        });
        if (!cancelled) setMessages([saved]);
      } catch {
        if (!cancelled) {
          setMessages([
            {
              id: crypto.randomUUID(),
              session_id: activeSession.id,
              created_at: new Date().toISOString(),
              phase: 'config',
              role: 'agent',
              content: getOpeningMessage(firstName),
              reasoning: null,
            },
          ]);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [user?.id, session?.id, firstName, startNewSession, setMessages]);

  return null;
}
