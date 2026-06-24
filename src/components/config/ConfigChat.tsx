import { useCallback, useEffect, useRef, useState } from 'react';
import {
  configureChat,
  configureQuickSetup,
  configureUpload,
  launchAgentToSimulation,
} from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';
import { useMessages } from '../../hooks/useMessages';
import { useFileParser } from '../../hooks/useFileParser';
import { useVoice } from '../../hooks/useVoice';
import { isProfileReady, isUrlOnlyMessage } from '../../lib/constants';
import { MessageList } from './MessageList';
import { VoiceConfigInput } from './VoiceConfigInput';
import { QuickSetupForm } from './QuickSetupForm';
import type { CompanyProfile, Message, Session } from '../../lib/types';

const URL_DECLINE_MESSAGE =
  "I can't fetch URLs directly yet, but paste the job description text here and I'll work with that.";

export function ConfigChat() {
  const {
    session,
    setSession,
    setLoading,
    setError,
    setPhase,
    phase,
    isLoading,
    error,
    setMessages,
  } = useSessionContext();
  const { configMessages, addMessage } = useMessages();
  const { extractFileText } = useFileParser();
  const {
    speak,
    startAutoListen,
    stopListening,
    isListening,
    isSpeaking,
    interimTranscript,
    isSupported,
  } = useVoice();
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [readyToSynthesize, setReadyToSynthesize] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const handleSendRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const autoLaunchRef = useRef(false);

  useEffect(() => {
    autoLaunchRef.current = false;
  }, [session?.id]);

  useEffect(() => {
    if (session?.company_profile) {
      setReadyToSynthesize(isProfileReady(session.company_profile));
    }
  }, [session?.id, session?.company_profile]);

  const runLaunch = useCallback(
    async (sessionSnapshot: Session, profile?: CompanyProfile) => {
      setLoading(true);
      setError(null);
      setUploadStatus('Building your agent...');
      try {
        const result = await launchAgentToSimulation(sessionSnapshot.id);
        setSession({
          ...sessionSnapshot,
          status: 'simulating',
          company_profile: profile ?? sessionSnapshot.company_profile,
          agent_persona: result.agent_persona,
          agent_strategy: result.agent_strategy,
        });
        setMessages(result.messages);
        setPhase('simulating');
      } catch (err) {
        autoLaunchRef.current = false;
        setError(err instanceof Error ? err.message : 'Failed to build agent');
      } finally {
        setLoading(false);
        setUploadStatus(null);
      }
    },
    [setLoading, setError, setSession, setMessages, setPhase],
  );

  useEffect(() => {
    if (!readyToSynthesize || !session || isLoading || phase !== 'configuring') return;
    if (autoLaunchRef.current) return;

    autoLaunchRef.current = true;
    setUploadStatus('Profile complete. Generating your agent...');
    const timer = window.setTimeout(() => {
      void runLaunch(session);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [readyToSynthesize, session, isLoading, phase, runLaunch]);

  const openListenWindow = useCallback(() => {
    if (inputMode !== 'voice' || !isSupported) return;
    startAutoListen({
      onFinal: (spoken) => {
        void handleSendRef.current(spoken);
      },
    });
  }, [inputMode, isSupported, startAutoListen]);

  useEffect(() => {
    const lastAgent = [...configMessages]
      .reverse()
      .find((m) => m.role === 'agent');
    if (!lastAgent || lastAgent.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = lastAgent.id;

    let cancelled = false;

    void (async () => {
      await speak(lastAgent.content);
      if (cancelled || inputMode !== 'voice') return;
      openListenWindow();
    })();

    return () => {
      cancelled = true;
    };
  }, [configMessages, speak, inputMode, openListenWindow]);

  useEffect(() => {
    if (isLoading) stopListening();
  }, [isLoading, stopListening]);

  const handleSend = async (text: string) => {
    if (!session) return;
    stopListening();

    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      session_id: session.id,
      created_at: new Date().toISOString(),
      phase: 'config',
      role: 'user',
      content: trimmed,
      reasoning: null,
    };
    addMessage(userMsg);

    if (isUrlOnlyMessage(trimmed)) {
      const agentMsg: Message = {
        id: crypto.randomUUID(),
        session_id: session.id,
        created_at: new Date().toISOString(),
        phase: 'config',
        role: 'agent',
        content: URL_DECLINE_MESSAGE,
        reasoning: null,
      };
      addMessage(agentMsg);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await configureChat(session.id, trimmed);
      setSession({
        ...session,
        company_profile: response.company_profile,
      });
      setReadyToSynthesize(response.ready_to_synthesize);

      if (response.agent_reply) {
        const agentMsg: Message = {
          id: crypto.randomUUID(),
          session_id: session.id,
          created_at: new Date().toISOString(),
          phase: 'config',
          role: 'agent',
          content: response.agent_reply,
          reasoning: null,
        };
        addMessage(agentMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  handleSendRef.current = handleSend;

  const handleFile = async (file: File) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setUploadStatus(`Reading ${file.name}...`);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      session_id: session.id,
      created_at: new Date().toISOString(),
      phase: 'config',
      role: 'user',
      content: `Uploaded: ${file.name}`,
      reasoning: null,
    };
    addMessage(userMsg);

    try {
      const fileText = await extractFileText(file);
      setUploadStatus('Analyzing your document...');

      const response = await configureUpload(session.id, fileText);
      const updatedSession = {
        ...session,
        company_profile: response.company_profile,
        config_source: 'upload' as const,
      };
      setSession(updatedSession);
      if (response.ready_to_synthesize) {
        autoLaunchRef.current = true;
        setReadyToSynthesize(true);
        await runLaunch(updatedSession, response.company_profile);
        return;
      }
      setReadyToSynthesize(response.ready_to_synthesize);

      if (response.agent_reply) {
        const agentMsg: Message = {
          id: crypto.randomUUID(),
          session_id: session.id,
          created_at: new Date().toISOString(),
          phase: 'config',
          role: 'agent',
          content: response.agent_reply,
          reasoning: null,
        };
        addMessage(agentMsg);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process file',
      );
    } finally {
      setLoading(false);
      if (!autoLaunchRef.current) {
        setUploadStatus(null);
      }
    }
  };

  const handleQuickSetup = async (data: CompanyProfile) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await configureQuickSetup(session.id, data);
      const updatedSession = {
        ...session,
        company_profile: response.company_profile,
        config_source: 'quicksetup' as const,
      };
      setSession(updatedSession);
      setReadyToSynthesize(true);
      setShowQuickSetup(false);
      autoLaunchRef.current = true;
      await runLaunch(updatedSession, response.company_profile);
    } catch (err) {
      autoLaunchRef.current = false;
      setError(err instanceof Error ? err.message : 'Quick setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MessageList messages={configMessages} isLoading={isLoading} />
      <div className="shrink-0">
        {uploadStatus && (
          <p className="px-4 text-sm text-teal animate-pulse">{uploadStatus}</p>
        )}
        {error && (
          <p className="px-4 text-sm text-err">{error}</p>
        )}
        <VoiceConfigInput
          onSend={handleSend}
          disabled={isLoading}
          onFileSelect={handleFile}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          isListening={isListening}
          isSpeaking={isSpeaking}
          interimTranscript={interimTranscript}
          isSupported={isSupported}
          onStartListening={openListenWindow}
          onStopListening={stopListening}
        />

        <div className="border-t border-line px-4 pb-4 pt-3">
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowQuickSetup((v) => !v)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-fg-secondary transition hover:bg-app-raised hover:text-teal"
            >
              {showQuickSetup ? 'Hide quick setup' : 'Quick setup (company + role)'}
            </button>
          </div>
          {showQuickSetup && (
            <div className="mt-3">
              <QuickSetupForm onSubmit={handleQuickSetup} disabled={isLoading} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
