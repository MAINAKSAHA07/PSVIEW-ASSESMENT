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
      <div className="rounded-lg border border-teal/30 bg-teal-light px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-teal">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-txt-primary">{value}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-surface-border px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-txt-tertiary">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-txt-tertiary">Waiting...</p>
    </div>
  );
}

function ExtractionPanelContent({ profile }: { profile: CompanyProfile }) {
  const sources = profile.field_sources ?? {};
  const filledCount = REQUIRED_FIELDS.filter((key) => {
    const src = sources[key as string];
    return profile[key] && src?.source && (src.confidence ?? 0) >= 0.7;
  }).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-border px-4 py-4">
        <h2 className="font-serif text-lg text-txt-primary">Building your profile</h2>
        <p className="mt-1 text-xs text-txt-secondary">
          {filledCount} of {REQUIRED_FIELDS.length} fields captured
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-teal transition-all duration-500"
            style={{
              width: `${(filledCount / REQUIRED_FIELDS.length) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin">
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
