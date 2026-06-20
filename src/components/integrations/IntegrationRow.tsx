interface IntegrationRowProps {
  name: string;
  badge: string;
}

export function IntegrationRow({ name, badge }: IntegrationRowProps) {
  const isComingSoon = badge === 'Coming Soon';

  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border px-4 py-3 mb-2">
      <span className="text-sm text-txt-primary">{name}</span>
      <span
        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
          isComingSoon
            ? 'bg-surface-raised text-txt-tertiary'
            : 'bg-teal-light text-teal'
        }`}
      >
        {badge}
      </span>
    </div>
  );
}
