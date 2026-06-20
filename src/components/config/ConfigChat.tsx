import { useState } from 'react';
import {
  configureChat,
  configureQuickSetup,
  configureUpload,
  updateSessionStatus,
} from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';
import { useMessages } from '../../hooks/useMessages';
import { useFileParser } from '../../hooks/useFileParser';
import { isProfileReady } from '../../lib/constants';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
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
  const { configMessages, addMessage, reloadMessages } = useMessages();
  const { extractFileText } = useFileParser();
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [readyToSynthesize, setReadyToSynthesize] = useState(false);

  const handleSend = async (text: string) => {
    if (!session) return;

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

      await reloadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const fileText = await extractFileText(file);
      const response = await configureUpload(session.id, fileText);
      setSession({
        ...session,
        company_profile: response.company_profile,
        config_source: 'upload',
      });
      setReadyToSynthesize(response.ready_to_synthesize);
      await reloadMessages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process file',
      );
    } finally {
      setLoading(false);
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
    <div className="flex h-full flex-col">
      <MessageList messages={configMessages} />
      {error && (
        <p className="px-4 text-sm text-error">{error}</p>
      )}
      {canGenerate && (
        <div className="border-t border-surface-border px-4 py-3">
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
      <MessageInput
        onSend={handleSend}
        disabled={isLoading}
        onFileSelect={handleFile}
      >
        <button
          type="button"
          onClick={() => setShowQuickSetup((v) => !v)}
          className="mt-2 text-xs text-txt-tertiary hover:text-teal"
        >
          {showQuickSetup ? 'Hide quick setup' : 'Quick setup'}
        </button>
        {showQuickSetup && (
          <QuickSetupForm onSubmit={handleQuickSetup} disabled={isLoading} />
        )}
      </MessageInput>
    </div>
  );
}
