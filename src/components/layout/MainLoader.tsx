import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import { fetchMessages } from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';
import type { Message, Session } from '../../lib/types';

export function MainLoader() {
  const { firstName } = useAuth();
  const { startNewSession } = useSession();
  const { session, setSession, setMessages, messages } = useSessionContext();

  useEffect(() => {
    if (session) return;

    let cancelled = false;

    async function init() {
      const newSession = await startNewSession();
      if (cancelled || !newSession) return;

      const openingContent = `Hey ${firstName}, I'm going to be your recruiting agent. Two ways to start: Drop a file with your company info, or just tell me: what does your company do?`;

      const openingMessage: Message = {
        id: crypto.randomUUID(),
        session_id: (newSession as Session).id,
        created_at: new Date().toISOString(),
        phase: 'config',
        role: 'agent',
        content: openingContent,
        reasoning: null,
      };

      setMessages([openingMessage]);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [session, startNewSession, firstName, setMessages]);

  useEffect(() => {
    if (!session || messages.length > 0) return;

    fetchMessages(session.id).then((data) => {
      if (data.length > 0) {
        setMessages(data);
        setSession({ ...session, status: session.status });
      }
    }).catch(() => {
      /* opening message handled above */
    });
  }, [session, messages.length, setMessages, setSession]);

  return null;
}
