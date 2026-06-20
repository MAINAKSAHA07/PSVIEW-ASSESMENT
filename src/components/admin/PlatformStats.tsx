import { Link } from 'react-router-dom';

export type AdminStatSection =
  | 'companies'
  | 'agents'
  | 'candidates'
  | 'applications'
  | 'conversations'
  | 'interest';

export const ADMIN_STAT_SECTIONS: AdminStatSection[] = [
  'companies',
  'agents',
  'candidates',
  'applications',
  'conversations',
  'interest',
];

export function isAdminStatSection(value: string): value is AdminStatSection {
  return ADMIN_STAT_SECTIONS.includes(value as AdminStatSection);
}

export const ADMIN_SECTION_META: Record<
  AdminStatSection,
  { title: string; description: string }
> = {
  companies: {
    title: 'Companies',
    description: 'Manage hiring companies and employer accounts.',
  },
  agents: {
    title: 'Active agents',
    description: 'View published and draft recruiting agents.',
  },
  candidates: {
    title: 'Candidates',
    description: 'Add and manage candidate profiles on the platform.',
  },
  applications: {
    title: 'Applications',
    description: 'Review and update candidate application statuses.',
  },
  conversations: {
    title: 'Conversations',
    description: 'Browse all agent sessions and simulation chats.',
  },
  interest: {
    title: 'Average interest',
    description: 'Engagement scores from completed candidate conversations.',
  },
};

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

export function PlatformStats({ stats }: PlatformStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {STAT_ITEMS.map((item) => (
        <Link
          key={item.key}
          to={`/app/${item.key}`}
          className="rounded-lg border border-line bg-app-card p-4 text-left transition hover:border-teal/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
        >
          <p className="text-xs text-fg-secondary">{item.label}</p>
          <p className="mt-1 text-2xl font-medium text-fg-primary">
            {item.getValue(stats)}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-teal">
            View details
          </p>
        </Link>
      ))}
    </div>
  );
}
