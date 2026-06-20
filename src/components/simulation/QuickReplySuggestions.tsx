import { QUICK_REPLY_SUGGESTIONS } from '../../lib/constants';

interface QuickReplySuggestionsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function QuickReplySuggestions({
  onSelect,
  disabled,
}: QuickReplySuggestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {QUICK_REPLY_SUGGESTIONS.map((text) => (
        <button
          key={text}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(text)}
          className="rounded-full border border-surface-border px-3 py-1 text-xs text-txt-secondary transition hover:border-teal hover:text-teal disabled:opacity-50"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
