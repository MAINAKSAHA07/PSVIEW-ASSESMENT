import { useCallback, useEffect, useRef, useState } from 'react';
import {
  configureChat,
  configureQuickSetup,
  configureUpload,
  updateSessionStatus,
} from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';
import { useMessages } from '../../hooks/useMessages';
import { useFileParser } from '../../hooks/useFileParser';
import { useVoice } from '../../hooks/useVoice';
import { isProfileReady } from '../../lib/constants';
import { MessageList } from './MessageList';
import { VoiceConfigInput } from './VoiceConfigInput';
import { QuickSetupForm } from './QuickSetupForm';
import type { CompanyProfile, Message } from '../../lib/types';

export function ConfigChat() {
  const {
    session,
    setSession,
    setLoading,
    setError,
    setPhase,
    isLoading,
    error,
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

    const userMsg: Message = {
      id: crypto.randomUUID(),
      session_id: session.id,
      created_at: new Date().toISOString(),
      phase: 'config',
      role: 'user',
      content: text,
      reasoning: null,
    };
    addMessage(userMsg);

    setLoading(true);
    setError(null);
    try {
      const response = await configureChat(session.id, text);
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
      setSession({
        ...session,
        company_profile: response.company_profile,
        config_source: 'upload',
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
      setError(
        err instanceof Error ? err.message : 'Failed to process file',
      );
    } finally {
      setLoading(false);
      setUploadStatus(null);
    }
  };

  const handleQuickSetup = async (data: CompanyProfile) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await configureQuickSetup(session.id, data);
      setSession({
        ...session,
        company_profile: response.company_profile,
        config_source: 'quicksetup',
      });
      setReadyToSynthesize(true);
      setShowQuickSetup(false);
      await handleGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      await updateSessionStatus(session.id, 'synthesizing');
      setSession({ ...session, status: 'synthesizing' });
      setPhase('synthesizing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start synthesis');
    } finally {
      setLoading(false);
    }
  };

  const profile = session?.company_profile ?? {};
  const canGenerate =
    readyToSynthesize || isProfileReady(profile);

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
        {canGenerate && (
          <div className="border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full rounded-lg bg-coral py-2.5 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
            >
              Generate Agent
            </button>
          </div>
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
              {showQuickSetup ? 'Hide quick setup' : 'Quick setup'}
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
