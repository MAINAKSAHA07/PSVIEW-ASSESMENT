import { useEffect, useState } from 'react';
import { simulateReply, simulateReset, simulateSummarize } from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';
import { useMessages } from '../../hooks/useMessages';
import { useSession } from '../../hooks/useSession';
import { TwoColumnLayout } from '../layout/TwoColumnLayout';
import { PublishButton } from '../employer/PublishButton';
import { CandidateSummaryCard } from '../shared/CandidateSummaryCard';
import { ConversationThread } from './ConversationThread';
import { QuickReplySuggestions } from './QuickReplySuggestions';
import { ReasoningPanel } from './ReasoningPanel';
import { AgentConfigSummary } from './AgentConfigSummary';
import type { CandidateSummary, Message, ReasoningTrace } from '../../lib/types';

export function SimulationView() {
  const { session, setSession, setPhase, setLoading, isLoading, setError } =
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
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<CandidateSummary | null>(() => {
    const s = session?.candidate_summary;
    if (s && typeof s === 'object' && 'interest_level' in s) {
      return s as CandidateSummary;
    }
    return null;
  });

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

  const userTurns = simulationMessages.filter((m) => m.role === 'user').length;
  const agentName = session?.agent_persona?.name ?? 'Agent';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!session) return;
    setGeneratingSummary(true);
    setError(null);
    try {
      const response = await simulateSummarize(session.id);
      setSummary(response.candidate_summary);
      setSession({ ...session, candidate_summary: response.candidate_summary });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summary failed');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleReset = async () => {
    if (!session) return;
    setLoading(true);
    setSummary(null);
    try {
      const response = await simulateReset(session.id);
      setReasoning(response.reasoning);
      await reloadMessages('simulation');
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
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-medium text-fg-primary">{companyName}</p>
                <p className="text-xs text-fg-secondary">{role}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-teal">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
                Active
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ConversationThread messages={simulationMessages} />
              {summary && (
                <div className="px-4 pb-4">
                  <CandidateSummaryCard summary={summary} agentName={agentName} />
                </div>
              )}
            </div>
            {userTurns >= 4 && !summary && (
              <div className="shrink-0 border-t border-line px-4 py-3">
                <button
                  type="button"
                  onClick={handleSummarize}
                  disabled={generatingSummary || isLoading}
                  className="rounded-lg border border-teal px-4 py-2 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50"
                >
                  {generatingSummary ? 'Generating summary...' : 'Generate summary'}
                </button>
              </div>
            )}
            <QuickReplySuggestions onSelect={handleSend} disabled={isLoading} />
            <div className="shrink-0 border-t border-line p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend(text);
                }}
                className="flex gap-2"
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Reply as candidate..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 resize-none rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-teal focus:outline-none disabled:opacity-50"
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
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
        <PublishButton />
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="rounded-lg border border-line px-4 py-2 text-xs text-fg-secondary hover:border-teal hover:text-teal disabled:opacity-50"
        >
          Reset conversation
        </button>
        <button
          type="button"
          onClick={handleNewCompany}
          disabled={isLoading}
          className="rounded-lg border border-line px-4 py-2 text-xs text-fg-secondary hover:border-coral hover:text-coral disabled:opacity-50"
        >
          New company
        </button>
      </div>
    </div>
  );
}
