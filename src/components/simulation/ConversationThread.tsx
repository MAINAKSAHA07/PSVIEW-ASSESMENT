import type { Message } from '../../lib/types';
import { AgentAvatar } from '../ui/Icons';

interface ConversationThreadProps {
  messages: Message[];
}

export function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <div className="space-y-4 px-4 py-4">
      {messages.map((msg) =>
        msg.role === 'agent' ? (
          <div key={msg.id} className="flex gap-3">
            <AgentAvatar />
            <div>
              <div
                className="max-w-[85%] px-4 py-3 text-sm text-fg-primary"
                style={{
                  backgroundColor: 'var(--agent-bubble-bg)',
                  borderRadius: '12px',
                  borderTopLeftRadius: '4px',
                }}
              >
                {msg.content}
              </div>
              <p className="mt-1 text-[11px] text-fg-tertiary">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ) : msg.role === 'user' ? (
          <div key={msg.id} className="flex justify-end">
            <div>
              <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-coral px-4 py-3 text-sm text-white">
                {msg.content}
              </div>
              <p className="mt-1 text-right text-[11px] text-fg-tertiary">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
