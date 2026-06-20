import { useRef, useState } from 'react';
import { IconPaperclip } from '../ui/Icons';

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
    <div className="border-t border-line p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-secondary transition hover:text-fg-primary disabled:opacity-50"
                title="Upload file"
              >
                <IconPaperclip />
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
            className={`w-full resize-none rounded-[10px] border border-line bg-app-card py-2.5 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-coral focus:outline-none disabled:opacity-50 ${onFileSelect ? 'pl-10 pr-3' : 'px-3'}`}
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || sending || disabled}
          className="rounded-[10px] bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-dark disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
      {children}
    </div>
  );
}
