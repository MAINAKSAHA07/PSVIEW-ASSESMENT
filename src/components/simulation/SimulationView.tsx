import { useEffect, useState } from 'react';
import { simulateReply, simulateReset } from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';
import { useMessages } from '../../hooks/useMessages';
import { useSession } from '../../hooks/useSession';
import { TwoColumnLayout } from '../layout/TwoColumnLayout';
import { ConversationThread } from './ConversationThread';
import { QuickReplySuggestions } from './QuickReplySuggestions';
import { ReasoningPanel } from './ReasoningPanel';
import { AgentConfigSummary } from './AgentConfigSummary';
import type { Message, ReasoningTrace } from '../../lib/types';

export function SimulationView() {
  const { session, setPhase, setLoading, isLoading, setError } =
    useSessionContext();
  const { simulationMessages, addMessage, reloadMessages } = useMessages();
  const { startNewSession } = useSession();
  const [text, setText] = useState('');
  const [reasoning, setReasoning] = useState<ReasoningTrace | null>(() => {
    const lastAgent = [...simulationMessages]
      .reverse()
      .find((m) => m.role === 'agent');
    return lastAgent?.reasoning ?? null;
  });
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (session) {
      reloadMessages('simulation').catch(() => undefined);
    }
  }, [session?.id]);

  useEffect(() => {
    const lastAgent = [...simulationMessages]
      .reverse()
      .find((m) => m.role === 'agent');
    if (lastAgent?.reasoning) {
      setReasoning(lastAgent.reasoning);
    }
  }, [simulationMessages]);

  const handleSend = async (message: string) => {
    if (!session || !message.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      session_id: session.id,
      created_at: new Date().toISOString(),
      phase: 'simulation',
      role: 'user',
      content: message.trim(),
      reasoning: null,
    };
    addMessage(userMsg);
    setText('');
    setAnalyzing(true);
    setReasoning(null);
    setLoading(true);
    setError(null);

    try {
      const response = await simulateReply(session.id, message.trim());
      setReasoning(response.reasoning);

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        session_id: session.id,
        created_at: new Date().toISOString(),
        phase: 'simulation',
        role: 'agent',
        content: response.agent_message,
        reasoning: response.reasoning,
      };
      addMessage(agentMsg);
      await reloadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const response = await simulateReset(session.id);
      setReasoning(response.reasoning);
      await reloadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNewCompany = async () => {
    await startNewSession();
    setPhase('configuring');
  };

  const companyName = session?.company_profile?.company_name ?? 'Company';
  const role = session?.company_profile?.role ?? 'Role';

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <TwoColumnLayout
        left={
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-txt-primary">{companyName}</p>
                <p className="text-xs text-txt-secondary">{role}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-teal">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
                Active
              </span>
            </div>
            <ConversationThread messages={simulationMessages} />
            <QuickReplySuggestions
              onSelect={handleSend}
              disabled={isLoading}
            />
            <div className="border-t border-surface-border p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(text);
                }}
                className="flex gap-2"
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Reply as candidate..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 resize-none rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-teal focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || isLoading}
                  className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        }
        right={
          <div className="flex h-full flex-col">
            <ReasoningPanel reasoning={reasoning} loading={analyzing} />
            <AgentConfigSummary />
          </div>
        }
      />
      <div className="flex gap-3 border-t border-surface-border px-4 py-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="rounded-lg border border-surface-border px-4 py-2 text-xs text-txt-secondary hover:border-teal hover:text-teal disabled:opacity-50"
        >
          Reset conversation
        </button>
        <button
          type="button"
          onClick={handleNewCompany}
          disabled={isLoading}
          className="rounded-lg border border-surface-border px-4 py-2 text-xs text-txt-secondary hover:border-coral hover:text-coral disabled:opacity-50"
        >
          New company
        </button>
      </div>
    </div>
  );
}
