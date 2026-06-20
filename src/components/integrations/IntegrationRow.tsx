interface IntegrationRowProps {
  name: string;
  badge: string;
}

export function IntegrationRow({ name, badge }: IntegrationRowProps) {
  const isComingSoon = badge === 'Coming Soon';

  return (
    <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3 mb-2">
      <span className="text-sm text-fg-primary">{name}</span>
      <span
        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
          isComingSoon
            ? 'bg-app-raised text-fg-tertiary'
            : 'bg-teal-light text-teal'
        }`}
      >
        {badge}
      </span>
    </div>
  );
}
