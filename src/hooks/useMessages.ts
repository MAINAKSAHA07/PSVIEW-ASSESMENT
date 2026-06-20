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
  const incomingKeys = new Set(
    incoming.map((m) => `${m.role}::${m.content}`),
  );
  const localOnly = current
    .filter((m) => m.phase === phase)
    .filter((m) => !incomingKeys.has(`${m.role}::${m.content}`));
  const merged = [...otherPhases, ...localOnly, ...incoming];
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
      const data = await fetchMessages(session.id, phase);
      if (phase) {
        setMessages(mergePhaseMessages(messages, phase, data));
      } else {
        setMessages(data);
      }
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
