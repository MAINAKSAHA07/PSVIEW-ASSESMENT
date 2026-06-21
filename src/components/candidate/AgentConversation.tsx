import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchSession,
  fetchMessages,
  parseResume,
  simulateReply,
  simulateReset,
  simulateSummarize,
  updateApplicationMatchScore,
} from '../../lib/api';
import { computeRoleMatch } from '../../lib/matching';
import { useProfileContext } from '../../context/ProfileContext';
import { useFileParser } from '../../hooks/useFileParser';
import { useVoice } from '../../hooks/useVoice';
import type { CandidateApplication, Message, RoleMatch, Session } from '../../lib/types';
import { VoiceConfigInput } from '../config/VoiceConfigInput';
import { FitAssessmentCard } from '../shared/FitAssessmentCard';
import { ConversationThread } from '../simulation/ConversationThread';
import { QuickReplySuggestions } from '../simulation/QuickReplySuggestions';
import { CandidateSummaryCard } from '../shared/CandidateSummaryCard';

interface AgentConversationProps {
  application: CandidateApplication;
  onBack: () => void;
}

export function AgentConversation({ application, onBack }: AgentConversationProps) {
  const sessionId = application.conversation_session_id;
  const { refreshProfile } = useProfileContext();
  const { extractFileText } = useFileParser();
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState(application.candidate_summary);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [voiceReady, setVoiceReady] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [publishedSession, setPublishedSession] = useState<Session | null>(null);
  const [match, setMatch] = useState<RoleMatch | null>(application.match_score);

  const lastSpokenIdRef = useRef<string | null>(null);
  const handleSendRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const company = publishedSession?.company_profile ?? {};
  const roleTitle = company.role ?? 'Open role';

  useEffect(() => {
    void fetchSession(application.session_id)
      .then((data) => setPublishedSession(data as Session))
      .catch(() => undefined);
  }, [application.session_id]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    void (async () => {
      try {
        const existing = await fetchMessages(sessionId, 'simulation');
        if (cancelled) return;

        if (existing.length > 0) {
          setMessages(existing);
          return;
        }

        const response = await simulateReset(sessionId, { hideReasoning: true });
        if (cancelled) return;

        if (response.agent_message) {
          setMessages([
            {
              id: crypto.randomUUID(),
              session_id: sessionId,
              created_at: new Date().toISOString(),
              phase: 'simulation',
              role: 'agent',
              content: response.agent_message,
              reasoning: null,
            },
          ]);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load conversation. Try again in a moment.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, summary, match, uploadStatus]);

  const openListenWindow = useCallback(() => {
    if (inputMode !== 'voice' || !isSupported || loading || !voiceReady) return;
    startAutoListen({
      onFinal: (spoken) => {
        void handleSendRef.current(spoken);
      },
    });
  }, [inputMode, isSupported, loading, voiceReady, startAutoListen]);

  const speakLastAgentMessage = useCallback(async () => {
    const lastAgent = [...messages].reverse().find((m) => m.role === 'agent');
    if (!lastAgent || lastAgent.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = lastAgent.id;
    await speak(lastAgent.content);
    if (inputMode === 'voice' && !loading) {
      openListenWindow();
    }
  }, [messages, speak, inputMode, loading, openListenWindow]);

  useEffect(() => {
    if (inputMode !== 'voice' || !voiceReady || loading) return;
    void speakLastAgentMessage();
  }, [messages, inputMode, voiceReady, loading, speakLastAgentMessage]);

  useEffect(() => {
    if (loading) stopListening();
  }, [loading, stopListening]);

  const enableVoice = useCallback(() => {
    unlockAudio();
    setVoiceReady(true);
  }, [unlockAudio]);

  const handleStartListening = useCallback(() => {
    unlockAudio();
    setVoiceReady(true);

    if (inputMode !== 'voice' || !isSupported || loading) return;

    void (async () => {
      const lastAgent = [...messages].reverse().find((m) => m.role === 'agent');
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
  }, [unlockAudio, inputMode, isSupported, loading, messages, speak, startAutoListen]);

  const handleInputModeChange = useCallback(
    (mode: 'voice' | 'text') => {
      setInputMode(mode);
      if (mode === 'text') {
        stopListening();
        return;
      }
      enableVoice();
    },
    [enableVoice, stopListening],
  );

  const handleSend = async (message: string) => {
    if (!sessionId || !message.trim()) return;
    stopListening();
    setLoading(true);
    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      created_at: new Date().toISOString(),
      phase: 'simulation',
      role: 'user',
      content: message.trim(),
      reasoning: null,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await simulateReply(sessionId, message.trim(), {
        hideReasoning: true,
      });
      const agentMsg: Message = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        created_at: new Date().toISOString(),
        phase: 'simulation',
        role: 'agent',
        content: response.agent_message,
        reasoning: null,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  handleSendRef.current = handleSend;

  const handleResumeUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setUploadStatus(`Reading ${file.name}...`);

    try {
      const fileText = await extractFileText(file);
      setUploadStatus('Parsing resume and checking fit for this role...');
      const { profile: updatedProfile } = await parseResume(fileText);
      await refreshProfile();

      const roleSession =
        publishedSession ??
        ((await fetchSession(application.session_id)) as Session);
      if (!publishedSession) setPublishedSession(roleSession);

      const newMatch = computeRoleMatch(updatedProfile, roleSession);
      setMatch(newMatch);
      await updateApplicationMatchScore(application.id, newMatch);
      setUploadStatus(`Fit updated: ${newMatch.score}% match for ${roleTitle}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume');
      setUploadStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!sessionId) return;
    setGeneratingSummary(true);
    setError(null);
    try {
      const response = await simulateSummarize(sessionId);
      setSummary(response.candidate_summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const hasSummary =
    summary &&
    typeof summary === 'object' &&
    'interest_level' in summary &&
    summary.interest_level;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-fg-secondary hover:text-teal"
          >
            ← Back to roles
          </button>
          <span className="text-xs text-teal">Voice & text · recruiting agent</span>
        </div>
        <div className="mt-2 min-w-0">
          <p className="truncate text-sm font-medium text-fg-primary">{roleTitle}</p>
          <p className="truncate text-xs text-fg-secondary">
            {company.company_name ?? 'Company'}
          </p>
        </div>
        {match && match.score > 0 && (
          <div className="mt-3">
            <FitAssessmentCard match={match} compact />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <ConversationThread messages={messages} />
        {hasSummary && (
          <div className="px-4 pb-4">
            <CandidateSummaryCard summary={summary} />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 border-t border-line bg-app">
        {error && <p className="px-4 pt-3 text-sm text-err">{error}</p>}
        {uploadStatus && !error && (
          <p className="px-4 pt-3 text-xs text-teal animate-pulse">{uploadStatus}</p>
        )}

        {inputMode === 'voice' && isSupported && !voiceReady && (
          <p className="border-b border-teal/20 bg-teal/10 px-4 py-2 text-center text-xs text-teal">
            Tap the microphone below to enable voice. Browsers require a tap before audio and
            the mic can start.
          </p>
        )}

        {userTurns >= 4 && !hasSummary && (
          <div className="border-b border-line px-4 py-3">
            <button
              type="button"
              onClick={handleSummarize}
              disabled={generatingSummary || loading}
              className="rounded-lg border border-teal px-4 py-2 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50"
            >
              {generatingSummary ? 'Generating...' : 'Generate summary'}
            </button>
          </div>
        )}

        <QuickReplySuggestions onSelect={handleSend} disabled={loading} />

        <VoiceConfigInput
          onSend={handleSend}
          disabled={loading}
          onFileSelect={handleResumeUpload}
          inputMode={inputMode}
          onInputModeChange={handleInputModeChange}
          isListening={isListening}
          isSpeaking={isSpeaking}
          interimTranscript={interimTranscript}
          isSupported={isSupported}
          onStartListening={handleStartListening}
          onStopListening={stopListening}
          placeholder="Ask about the role..."
        />
      </div>
    </div>
  );
}
