import { useEffect, useRef, useState } from 'react';
import { IconPaperclip } from '../ui/Icons';

interface VoiceConfigInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  onFileSelect?: (file: File) => void;
  inputMode: 'voice' | 'text';
  onInputModeChange: (mode: 'voice' | 'text') => void;
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  isSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

function IconMic({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function VoiceConfigInput({
  onSend,
  disabled,
  onFileSelect,
  inputMode,
  onInputModeChange,
  isListening,
  isSpeaking,
  interimTranscript,
  isSupported,
  onStartListening,
  onStopListening,
}: VoiceConfigInputProps) {
  const textMode = inputMode === 'text';
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showYourTurn, setShowYourTurn] = useState(false);
  const wasListeningRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isListening && !wasListeningRef.current && !isSpeaking && !textMode) {
      setShowYourTurn(true);
      const timer = window.setTimeout(() => setShowYourTurn(false), 2500);
      wasListeningRef.current = isListening;
      return () => window.clearTimeout(timer);
    }
    wasListeningRef.current = isListening;
    if (!isListening) setShowYourTurn(false);
    return undefined;
  }, [isListening, isSpeaking, textMode]);

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

  const statusText = (() => {
    if (textMode) return null;
    if (isSpeaking) return 'Agent is speaking...';
    if (isListening) {
      return interimTranscript
        ? 'Listening...'
        : 'Your turn. Speak now (5 sec window)';
    }
    if (isSupported) return 'Mic opens automatically after the agent speaks';
    return 'Voice not supported in this browser. Switch to Text mode.';
  })();

  return (
    <div className="border-t border-line bg-app-secondary/30 p-4">
      <div className="mb-4 flex justify-center">
        <div
          className="inline-flex rounded-lg border border-line bg-app-card p-1"
          role="tablist"
          aria-label="Input mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!textMode}
            onClick={() => {
              onInputModeChange('voice');
              onStopListening();
            }}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
              !textMode
                ? 'bg-coral text-white shadow-sm'
                : 'text-fg-secondary hover:text-fg-primary'
            }`}
          >
            Voice
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={textMode}
            onClick={() => {
              onInputModeChange('text');
              onStopListening();
            }}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
              textMode
                ? 'bg-coral text-white shadow-sm'
                : 'text-fg-secondary hover:text-fg-primary'
            }`}
          >
            Text
          </button>
        </div>
      </div>

      {!textMode ? (
        <div className="flex flex-col items-center gap-4">
          {showYourTurn && (
            <p className="animate-pulse rounded-full bg-teal/15 px-4 py-1.5 text-sm font-medium text-teal">
              Your turn — speak now
            </p>
          )}

          {statusText && !showYourTurn && (
            <p className="text-center text-sm text-fg-secondary">{statusText}</p>
          )}

          {(isListening || interimTranscript) && (
            <div className="w-full max-w-md rounded-lg border border-teal/40 bg-app-card px-4 py-3">
              <p className="text-center text-sm italic text-fg-primary">
                {interimTranscript || 'Waiting for your voice...'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-5">
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
                  disabled={disabled || sending || isListening || isSpeaking}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-app-card text-fg-secondary transition hover:border-coral hover:text-coral disabled:opacity-50"
                  title="Upload file"
                >
                  <IconPaperclip className="h-5 w-5" />
                </button>
              </>
            )}

            <button
              type="button"
              disabled={disabled || sending || !isSupported || isSpeaking}
              onClick={() => {
                if (isListening) onStopListening();
                else onStartListening();
              }}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white transition disabled:opacity-50 ${
                isListening
                  ? 'bg-teal shadow-[0_0_0_10px_rgba(45,212,168,0.2)] animate-pulse'
                  : isSpeaking
                    ? 'bg-app-raised text-fg-tertiary'
                    : 'bg-coral hover:bg-coral-dark shadow-md'
              }`}
              title={isListening ? 'Stop listening' : 'Start listening'}
            >
              <IconMic className="h-8 w-8" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl gap-2">
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
              rows={2}
              disabled={disabled || sending}
              className={`w-full resize-none rounded-[10px] border border-line bg-app-card py-2.5 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-coral focus:outline-none disabled:opacity-50 ${onFileSelect ? 'pl-10 pr-3' : 'px-3'}`}
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || sending || disabled}
            className="self-end rounded-[10px] bg-coral px-5 py-2.5 text-sm font-medium text-white transition hover:bg-coral-dark disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
