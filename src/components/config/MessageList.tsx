import { useEffect, useRef } from 'react';
import type { Message } from '../../lib/types';

interface MessageListProps {
  messages: Message[];
}

function AgentMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coral to-teal text-xs font-bold text-white">
        A
      </div>
      <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-surface-card px-4 py-3 text-sm leading-relaxed text-txt-primary">
        {content}
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-coral px-4 py-3 text-sm leading-relaxed text-white">
        {content}
      </div>
    </div>
  );
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
      {messages.map((msg) =>
        msg.role === 'agent' ? (
          <AgentMessage key={msg.id} content={msg.content} />
        ) : msg.role === 'user' ? (
          <UserMessage key={msg.id} content={msg.content} />
        ) : null,
      )}
      <div ref={bottomRef} />
    </div>
  );
}
