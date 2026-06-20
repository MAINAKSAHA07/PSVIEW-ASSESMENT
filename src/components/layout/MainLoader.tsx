import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import {
  fetchEmployerAgentSessions,
  fetchMessages,
  insertMessage,
} from '../../lib/api';
import { getOpeningMessage } from '../../lib/constants';
import { useSessionContext } from '../../context/SessionContext';

export function MainLoader() {
  const { firstName, user } = useAuth();
  const { loadSession, startNewSession } = useSession();
  const { session, setMessages } = useSessionContext();
  const [searchParams] = useSearchParams();
  const bootstrappedRef = useRef<string | null>(null);
  const hydratedRef = useRef<string | null>(null);

  const sessionParam = searchParams.get('session');
  const isNew = searchParams.get('new') === '1';
  const bootKey = `${user?.id ?? ''}:${sessionParam ?? ''}:${isNew}`;

  useEffect(() => {
    if (!user) return;
    if (bootstrappedRef.current === bootKey && session) return;

    let cancelled = false;

    async function bootstrap() {
      if (!user) return;

      if (isNew) {
        await startNewSession();
      } else if (sessionParam) {
        if (session?.id !== sessionParam) {
          await loadSession(sessionParam);
        }
      } else if (!session) {
        const sessions = await fetchEmployerAgentSessions(user.id);
        if (cancelled) return;
        if (sessions.length > 0) {
          await loadSession(sessions[0].id);
        } else {
          await startNewSession();
        }
      }

      if (!cancelled) bootstrappedRef.current = bootKey;
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    session,
    sessionParam,
    isNew,
    bootKey,
    loadSession,
    startNewSession,
  ]);

  useEffect(() => {
    if (!user || !session) return;
    if (hydratedRef.current === session.id) return;

    const activeSession = session;
    let cancelled = false;

    async function hydrate() {
      if (activeSession.status !== 'configuring') {
        const allMessages = await fetchMessages(activeSession.id);
        if (cancelled) return;
        hydratedRef.current = activeSession.id;
        setMessages(allMessages);
        return;
      }

      const configMessages = await fetchMessages(activeSession.id, 'config');
      if (cancelled) return;
      hydratedRef.current = activeSession.id;

      if (configMessages.length > 0) {
        setMessages(configMessages);
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

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [user, session, firstName, setMessages]);

  useEffect(() => {
    if (session?.id && hydratedRef.current && hydratedRef.current !== session.id) {
      hydratedRef.current = null;
    }
  }, [session?.id]);

  return null;
}
