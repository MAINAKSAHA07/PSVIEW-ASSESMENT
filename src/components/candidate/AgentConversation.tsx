import { useEffect, useState } from 'react';
import {
  fetchMessages,
  simulateReply,
  simulateReset,
  simulateSummarize,
} from '../../lib/api';
import type { CandidateApplication, Message } from '../../lib/types';
import { ConversationThread } from '../simulation/ConversationThread';
import { QuickReplySuggestions } from '../simulation/QuickReplySuggestions';
import { CandidateSummaryCard } from '../shared/CandidateSummaryCard';

interface AgentConversationProps {
  application: CandidateApplication;
  onBack: () => void;
}

export function AgentConversation({ application, onBack }: AgentConversationProps) {
  const sessionId = application.conversation_session_id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState(application.candidate_summary);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const userTurns = messages.filter((m) => m.role === 'user').length;

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

  const handleSend = async (message: string) => {
    if (!sessionId || !message.trim()) return;
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
    setText('');

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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-fg-secondary hover:text-teal"
        >
          ← Back to roles
        </button>
        <span className="text-xs text-teal">Talking to recruiting agent</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConversationThread messages={messages} />
        {hasSummary && (
          <div className="px-4 pb-4">
            <CandidateSummaryCard summary={summary} />
          </div>
        )}
      </div>

      {error && <p className="px-4 text-sm text-err">{error}</p>}

      {userTurns >= 4 && !hasSummary && (
        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={generatingSummary}
            className="rounded-lg border border-teal px-4 py-2 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50"
          >
            {generatingSummary ? 'Generating...' : 'Generate summary'}
          </button>
        </div>
      )}

      <QuickReplySuggestions onSelect={handleSend} disabled={loading} />
      <div className="border-t border-line p-4">
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
            placeholder="Ask about the role..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-teal focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
