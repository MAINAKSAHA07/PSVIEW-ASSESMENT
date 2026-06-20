import { useRef, useState } from 'react';

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  onFileSelect?: (file: File) => void;
  children?: React.ReactNode;
}

export function MessageInput({
  onSend,
  disabled,
  onFileSelect,
  children,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setText('');
    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-surface-border p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        {onFileSelect && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelect(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-border text-txt-secondary transition hover:border-teal hover:text-teal disabled:opacity-50"
              title="Upload file"
            >
              ↑
            </button>
          </>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Tell me about your company..."
          rows={1}
          disabled={disabled || sending}
          className="flex-1 resize-none rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-teal focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending || disabled}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-dark disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
      {children}
    </div>
  );
}
