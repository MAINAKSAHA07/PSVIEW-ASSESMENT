interface PlatformStatsProps {
  stats: {
    companies: number;
    activeAgents: number;
    candidates: number;
    applications: number;
    conversations: number;
    avgInterest: number;
  };
}

export function PlatformStats({ stats }: PlatformStatsProps) {
  const items = [
    { label: 'Companies', value: stats.companies },
    { label: 'Active agents', value: stats.activeAgents },
    { label: 'Candidates', value: stats.candidates },
    { label: 'Applications', value: stats.applications },
    { label: 'Conversations', value: stats.conversations },
    { label: 'Avg interest', value: `${stats.avgInterest}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-line bg-app-card p-4"
        >
          <p className="text-xs text-fg-secondary">{item.label}</p>
          <p className="mt-1 text-2xl font-medium text-fg-primary">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
