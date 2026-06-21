import { useCallback, useEffect, useRef, useState } from 'react';
import {
  simulateAnalyze,
  simulateReply,
  simulateReset,
  simulateSummarize,
} from '../../lib/api';
import {
  copyConversationMarkdown,
  formatConversationMarkdown,
} from '../../lib/exportConversation';
import { useSessionContext } from '../../context/SessionContext';
import { useMessages } from '../../hooks/useMessages';
import { useSession } from '../../hooks/useSession';
import { useVoice } from '../../hooks/useVoice';
import { PublishButton } from '../employer/PublishButton';
import { VoiceConfigInput } from '../config/VoiceConfigInput';
import { CandidateSummaryCard } from '../shared/CandidateSummaryCard';
import { ConversationThread } from './ConversationThread';
import { QuickReplySuggestions } from './QuickReplySuggestions';
import { ReasoningPanel } from './ReasoningPanel';
import { AgentConfigSummary } from './AgentConfigSummary';
import type { CandidateSummary, Message, ReasoningTrace } from '../../lib/types';

type MobilePanel = 'chat' | 'reasoning';

export function SimulationView() {
  const { session, setSession, setPhase, setLoading, isLoading, setError } =
    useSessionContext();
  const { simulationMessages, addMessage, reloadMessages } = useMessages();
  const { startNewSession } = useSession();
  const {
    speak,
    startAutoListen,
    stopListening,
    unlockAudio,
    isListening,
    isSpeaking,
    interimTranscript,
    isSupported,
  } = useVoice();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const handleSendRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [voiceReady, setVoiceReady] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('chat');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
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
    const lastAgent = [...simulationMessages]
      .reverse()
      .find((m) => m.role === 'agent');
    if (lastAgent?.reasoning) {
      setReasoning(lastAgent.reasoning);
    }
  }, [simulationMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simulationMessages, summary]);

  const openListenWindow = useCallback(() => {
    if (inputMode !== 'voice' || !isSupported || isLoading || !voiceReady) return;
    startAutoListen({
      onFinal: (spoken) => {
        void handleSendRef.current(spoken);
      },
    });
  }, [inputMode, isSupported, isLoading, voiceReady, startAutoListen]);

  const speakLastAgentMessage = useCallback(async () => {
    const lastAgent = [...simulationMessages]
      .reverse()
      .find((m) => m.role === 'agent');
    if (!lastAgent || lastAgent.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = lastAgent.id;
    await speak(lastAgent.content);
    if (inputMode === 'voice' && !isLoading && voiceReady) {
      openListenWindow();
    }
  }, [simulationMessages, speak, inputMode, isLoading, voiceReady, openListenWindow]);

  useEffect(() => {
    if (inputMode !== 'voice' || !voiceReady || isLoading) return;
    void speakLastAgentMessage();
  }, [simulationMessages, inputMode, voiceReady, isLoading, speakLastAgentMessage]);

  useEffect(() => {
    if (isLoading) stopListening();
  }, [isLoading, stopListening]);

  const handleInputModeChange = useCallback(
    (mode: 'voice' | 'text') => {
      setInputMode(mode);
      if (mode === 'text') {
        stopListening();
        return;
      }
      unlockAudio();
      setVoiceReady(true);
    },
    [stopListening, unlockAudio],
  );

  const handleStartListening = useCallback(() => {
    unlockAudio();
    setVoiceReady(true);
    if (inputMode !== 'voice' || !isSupported || isLoading) return;

    void (async () => {
      const lastAgent = [...simulationMessages]
        .reverse()
        .find((m) => m.role === 'agent');
      if (lastAgent && lastAgent.id !== lastSpokenIdRef.current) {
        lastSpokenIdRef.current = lastAgent.id;
        await speak(lastAgent.content);
      }
      startAutoListen({
        onFinal: (spoken) => {
          void handleSendRef.current(spoken);
        },
      });
    })();
  }, [
    unlockAudio,
    inputMode,
    isSupported,
    isLoading,
    simulationMessages,
    speak,
    startAutoListen,
  ]);

  const userTurns = simulationMessages.filter((m) => m.role === 'user').length;
  const agentName = session?.agent_persona?.name ?? 'Agent';

  const handleSend = async (message: string) => {
    if (!session || !message.trim()) return;

    stopListening();
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
    setAnalyzing(true);
    setReasoning(null);
    setLoading(true);
    setError(null);
    setMobilePanel('reasoning');

    try {
      const analysis = await simulateAnalyze(session.id, message.trim());
      if (analysis.reasoning) {
        setReasoning(analysis.reasoning);
      }

      const response = await simulateReply(session.id, message.trim(), {
        preAnalysis: analysis.candidate_analysis as unknown as Record<string, unknown>,
        preStrategyCheck: analysis.strategy_check as unknown as Record<string, unknown>,
      });

      if (response.reasoning) {
        setReasoning(response.reasoning);
      }

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        session_id: session.id,
        created_at: new Date().toISOString(),
        phase: 'simulation',
        role: 'agent',
        content: response.agent_message,
        reasoning: response.reasoning ?? null,
      };
      addMessage(agentMsg);
      setMobilePanel('chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  handleSendRef.current = handleSend;

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
      setReasoning(response.reasoning ?? null);
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

  const handleCopyConversation = async () => {
    if (!session) return;
    try {
      const markdown = formatConversationMarkdown({
        companyName: session.company_profile?.company_name ?? 'Company',
        roleTitle: session.company_profile?.role ?? 'Role',
        agentName,
        messages: simulationMessages,
        summary,
      });
      await copyConversationMarkdown(markdown);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const companyName = session?.company_profile?.company_name ?? 'Company';
  const roleTitle = session?.company_profile?.role ?? 'Role';
  const roleDisplay =
    roleTitle.length > 80 ? `${roleTitle.slice(0, 77)}...` : roleTitle;

  const chatPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="min-w-0 pr-4">
          <p className="truncate text-sm font-medium text-fg-primary">{companyName}</p>
          <p className="truncate text-xs text-fg-secondary">{roleDisplay}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-teal">
          <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
          Active
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <ConversationThread messages={simulationMessages} />
        {summary && (
          <div className="px-4 pb-4">
            <CandidateSummaryCard summary={summary} agentName={agentName} />
          </div>
        )}
        <div ref={chatEndRef} />
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
      <div className="shrink-0 border-t border-line bg-app">
        {inputMode === 'voice' && isSupported && !voiceReady && (
          <p className="border-b border-teal/20 bg-teal/10 px-4 py-2 text-center text-xs text-teal">
            Tap the microphone to enable voice. Speak as the candidate after the agent
            reads each reply.
          </p>
        )}
        <VoiceConfigInput
          onSend={handleSend}
          disabled={isLoading}
          inputMode={inputMode}
          onInputModeChange={handleInputModeChange}
          isListening={isListening}
          isSpeaking={isSpeaking}
          interimTranscript={interimTranscript}
          isSupported={isSupported}
          onStartListening={handleStartListening}
          onStopListening={stopListening}
          placeholder="Reply as candidate..."
        />
      </div>
    </div>
  );

  const reasoningPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <ReasoningPanel reasoning={reasoning} loading={analyzing} />
      </div>
      <AgentConfigSummary />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300">
        Preview mode — no emails or LinkedIn messages are sent. Use voice or text below to reply as the candidate and test how your agent responds.
      </div>

      <div className="flex shrink-0 border-b border-line lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePanel('chat')}
          className={`flex-1 px-4 py-2 text-xs font-medium ${
            mobilePanel === 'chat'
              ? 'border-b-2 border-coral text-coral'
              : 'text-fg-secondary'
          }`}
        >
          Conversation
        </button>
        <button
          type="button"
          onClick={() => setMobilePanel('reasoning')}
          className={`flex-1 px-4 py-2 text-xs font-medium ${
            mobilePanel === 'reasoning'
              ? 'border-b-2 border-teal text-teal'
              : 'text-fg-secondary'
          }`}
        >
          Reasoning
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
          <div
            className={`min-h-0 w-full lg:h-full lg:w-[60%] lg:border-r lg:border-line ${
              mobilePanel === 'chat' ? 'flex flex-1 flex-col' : 'hidden lg:flex lg:flex-col'
            }`}
          >
            {chatPanel}
          </div>
          <div
            className={`min-h-0 w-full bg-app-reasoning lg:h-full lg:w-[40%] ${
              mobilePanel === 'reasoning'
                ? 'flex flex-1 flex-col'
                : 'hidden lg:flex lg:flex-col'
            }`}
          >
            {reasoningPanel}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line px-3 py-3 sm:gap-3 sm:px-4">
        <PublishButton />
        <button
          type="button"
          onClick={() => void handleCopyConversation()}
          disabled={simulationMessages.length === 0}
          className="rounded-lg border border-line px-3 py-2 text-xs text-fg-secondary hover:border-teal hover:text-teal disabled:opacity-50 sm:px-4"
        >
          {copyState === 'copied'
            ? 'Copied!'
            : copyState === 'error'
              ? 'Copy failed'
              : 'Copy conversation'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="rounded-lg border border-line px-3 py-2 text-xs text-fg-secondary hover:border-teal hover:text-teal disabled:opacity-50 sm:px-4"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleNewCompany}
          disabled={isLoading}
          className="rounded-lg border border-line px-3 py-2 text-xs text-fg-secondary hover:border-coral hover:text-coral disabled:opacity-50 sm:px-4"
        >
          New company
        </button>
      </div>
    </div>
  );
}
