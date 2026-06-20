import { useCallback } from 'react';
import { fetchMessages } from '../lib/api';
import { useSessionContext } from '../context/SessionContext';
import type { Message, MessagePhase } from '../lib/types';

function mergePhaseMessages(
  current: Message[],
  phase: MessagePhase,
  incoming: Message[],
): Message[] {
  const otherPhases = current.filter((m) => m.phase !== phase);
  const merged = [...otherPhases, ...incoming];
  merged.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return merged;
}

export function useMessages() {
  const { session, messages, setMessages, addMessage } = useSessionContext();

  const reloadMessages = useCallback(
    async (phase?: MessagePhase) => {
      if (!session) return;
      if (phase) {
        const data = await fetchMessages(session.id, phase);
        setMessages(mergePhaseMessages(messages, phase, data));
        return;
      }
      const data = await fetchMessages(session.id);
      setMessages(data);
    },
    [session, messages, setMessages],
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
