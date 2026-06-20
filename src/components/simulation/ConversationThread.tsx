import type { Message } from '../../lib/types';

interface ConversationThreadProps {
  messages: Message[];
}

export function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
      {messages.map((msg) =>
        msg.role === 'agent' ? (
          <div key={msg.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coral to-teal text-xs font-bold text-white">
              A
            </div>
            <div>
              <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-surface-card px-4 py-3 text-sm text-txt-primary">
                {msg.content}
              </div>
              <p className="mt-1 text-[11px] text-txt-tertiary">
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
              <p className="mt-1 text-right text-[11px] text-txt-tertiary">
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
