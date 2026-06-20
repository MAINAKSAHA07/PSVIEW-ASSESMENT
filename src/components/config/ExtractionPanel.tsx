import { useSessionContext } from '../../context/SessionContext';
import type { CompanyProfile } from '../../lib/types';
import { KEY_PROFILE_FIELDS, REQUIRED_FIELDS } from '../../lib/constants';

interface ExtractedFieldProps {
  label: string;
  value: string;
  filled: boolean;
}

function ExtractedField({ label, value, filled }: ExtractedFieldProps) {
  if (filled) {
    return (
      <div
        className="rounded-lg px-3 py-2"
        style={{
          padding: '8px 12px',
          background: 'var(--surface-card)',
          border: '1px solid rgba(45, 212, 168, 0.3)',
        }}
      >
        <p
          className="uppercase"
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </p>
        <p className="text-[13px] text-fg-primary">{value}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg bg-app-card"
      style={{
        padding: '8px 12px',
        border: '1px dashed var(--border-default)',
        borderRadius: '8px',
      }}
    >
      <p
        className="uppercase"
        style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>-</p>
    </div>
  );
}

function ExtractionPanelContent({ profile }: { profile: CompanyProfile }) {
  const sources = profile.field_sources ?? {};
  const totalFields = REQUIRED_FIELDS.length;
  const filledCount = REQUIRED_FIELDS.filter((key) => {
    const src = sources[key as string];
    return profile[key] && src?.source && (src.confidence ?? 0) >= 0.7;
  }).length;
  const progressWidth = filledCount === 0 ? 0 : (filledCount / totalFields) * 100;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-6">
      <div className="shrink-0">
        <h2
          className="font-serif font-normal text-fg-primary"
          style={{ fontSize: '20px' }}
        >
          Building your profile
        </h2>
        <p className="mt-1 text-xs text-fg-secondary">
          {filledCount} of {totalFields} fields captured
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--surface-raised)' }}
        >
          <div
            className="h-full rounded-full bg-teal transition-all duration-500"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto scrollbar-thin">
        {KEY_PROFILE_FIELDS.map((field) => {
          const value = profile[field.key as keyof CompanyProfile] as
            | string
            | undefined;
          const src = sources[field.key as string];
          const filled = Boolean(
            value && src?.source && (src.confidence ?? 0) >= 0.7,
          );
          return (
            <ExtractedField
              key={field.key}
              label={field.label}
              value={value ?? ''}
              filled={filled}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ExtractionPanel() {
  const { session } = useSessionContext();
  const profile = session?.company_profile ?? {};
  return <ExtractionPanelContent profile={profile} />;
}
