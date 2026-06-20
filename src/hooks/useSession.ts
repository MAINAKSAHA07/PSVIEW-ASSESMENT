import { useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  createSession,
  fetchMessages,
  fetchSession,
  fetchUserSessions,
} from '../lib/api';
import { useSessionContext } from '../context/SessionContext';
import type { Session } from '../lib/types';

export function useSession() {
  const { user } = useAuth();
  const {
    session,
    setSession,
    setMessages,
    setLoading,
    setError,
    reset,
  } = useSessionContext();

  const loadSession = useCallback(
    async (sessionId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSession(sessionId);
        setSession(data as Session);
        const messages = await fetchMessages(sessionId);
        setMessages(messages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    },
    [setSession, setMessages, setLoading, setError],
  );

  const startNewSession = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      reset();
      const data = await createSession(user.id);
      setSession(data as Session);
      setMessages([]);
      return data as Session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, reset, setSession, setMessages, setLoading, setError]);

  const loadUserSessions = useCallback(async () => {
    if (!user) return [];
    try {
      return await fetchUserSessions(user.id);
    } catch {
      return [];
    }
  }, [user]);

  return {
    session,
    loadSession,
    startNewSession,
    loadUserSessions,
  };
}
