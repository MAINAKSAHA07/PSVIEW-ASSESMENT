import { useEffect, useRef } from 'react';
import type { Message } from '../../lib/types';
import { AgentAvatar } from '../ui/Icons';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function AgentMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <AgentAvatar />
      <div
        className="max-w-[85%] px-4 py-3 text-sm leading-relaxed text-fg-primary"
        style={{
          backgroundColor: 'var(--agent-bubble-bg)',
          borderRadius: '12px',
          borderTopLeftRadius: '4px',
        }}
      >
        {content}
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[10px] rounded-tr-sm bg-coral px-4 py-3 text-sm leading-relaxed text-white">
        {content}
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin"
    >
      {messages.map((msg) =>
        msg.role === 'agent' ? (
          <AgentMessage key={msg.id} content={msg.content} />
        ) : msg.role === 'user' ? (
          <UserMessage key={msg.id} content={msg.content} />
        ) : null,
      )}
      {isLoading && (
        <div className="flex gap-3">
          <AgentAvatar />
          <div
            className="px-4 py-3 text-sm text-fg-secondary"
            style={{
              backgroundColor: 'var(--agent-bubble-bg)',
              borderRadius: '12px',
              borderTopLeftRadius: '4px',
            }}
          >
            <span className="animate-pulse">Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}
