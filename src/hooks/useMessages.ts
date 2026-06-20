import { useCallback } from 'react';
import { fetchMessages } from '../lib/api';
import { useSessionContext } from '../context/SessionContext';
import type { MessagePhase } from '../lib/types';

export function useMessages() {
  const { session, messages, setMessages, addMessage } = useSessionContext();

  const reloadMessages = useCallback(
    async (phase?: MessagePhase) => {
      if (!session) return;
      const data = await fetchMessages(session.id, phase);
      setMessages(data);
    },
    [session, setMessages],
  );

  const configMessages = messages.filter((m) => m.phase === 'config');
  const simulationMessages = messages.filter((m) => m.phase === 'simulation');

  return {
    messages,
    configMessages,
    simulationMessages,
    addMessage,
    reloadMessages,
  };
}
