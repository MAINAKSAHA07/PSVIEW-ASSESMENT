interface StepIndicatorProps {
  label: string;
  status: 'pending' | 'loading' | 'done';
}

export function StepIndicator({ label, status }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
          status === 'done'
            ? 'bg-teal text-app-bg'
            : status === 'loading'
              ? 'border-2 border-teal text-teal animate-pulse'
              : 'border border-line text-fg-tertiary'
        }`}
      >
        {status === 'done' ? '✓' : status === 'loading' ? '·' : ''}
      </div>
      <p
        className={`text-sm ${
          status === 'pending' ? 'text-fg-tertiary' : 'text-fg-primary'
        }`}
      >
        {label}
      </p>
    </div>
  );
}
