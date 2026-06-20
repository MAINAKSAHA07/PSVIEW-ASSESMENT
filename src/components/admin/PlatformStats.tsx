export type AdminStatSection =
  | 'companies'
  | 'agents'
  | 'candidates'
  | 'applications'
  | 'conversations'
  | 'interest';

interface PlatformStatsProps {
  stats: {
    companies: number;
    activeAgents: number;
    candidates: number;
    applications: number;
    conversations: number;
    avgInterest: number;
  };
  activeSection: AdminStatSection | null;
  onSelectSection: (section: AdminStatSection) => void;
}

const STAT_ITEMS: {
  key: AdminStatSection;
  label: string;
  getValue: (stats: PlatformStatsProps['stats']) => string | number;
}[] = [
  { key: 'companies', label: 'Companies', getValue: (s) => s.companies },
  { key: 'agents', label: 'Active agents', getValue: (s) => s.activeAgents },
  { key: 'candidates', label: 'Candidates', getValue: (s) => s.candidates },
  { key: 'applications', label: 'Applications', getValue: (s) => s.applications },
  {
    key: 'conversations',
    label: 'Conversations',
    getValue: (s) => s.conversations,
  },
  {
    key: 'interest',
    label: 'Avg interest',
    getValue: (s) => `${s.avgInterest}%`,
  },
];

export function PlatformStats({
  stats,
  activeSection,
  onSelectSection,
}: PlatformStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {STAT_ITEMS.map((item) => {
        const isActive = activeSection === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectSection(item.key)}
            className={`rounded-lg border bg-app-card p-4 text-left transition hover:border-teal/50 hover:shadow-sm ${
              isActive
                ? 'border-teal ring-2 ring-teal/20'
                : 'border-line'
            }`}
          >
            <p className="text-xs text-fg-secondary">{item.label}</p>
            <p className="mt-1 text-2xl font-medium text-fg-primary">
              {item.getValue(stats)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-teal">
              View details
            </p>
          </button>
        );
      })}
    </div>
  );
}
