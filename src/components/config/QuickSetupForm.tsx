import { useState } from 'react';
import type { CompanyProfile } from '../../lib/types';
import { KEY_PROFILE_FIELDS } from '../../lib/constants';

interface QuickSetupFormProps {
  onSubmit: (data: CompanyProfile) => Promise<void>;
  disabled?: boolean;
}

export function QuickSetupForm({ onSubmit, disabled }: QuickSetupFormProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(form.company_name?.trim() && form.role?.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const profile: CompanyProfile = {};
      for (const field of KEY_PROFILE_FIELDS) {
        const value = form[field.key as string]?.trim();
        if (value) {
          (profile as Record<string, string>)[field.key as string] = value;
        }
      }
      await onSubmit(profile);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-2 rounded-xl border border-line bg-app-card p-4"
    >
      <p className="text-xs font-medium text-fg-secondary">
        Quick setup — company and role required; other fields optional
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {KEY_PROFILE_FIELDS.map((field) => (
          <input
            key={field.key}
            type="text"
            placeholder={
              field.key === 'company_name' || field.key === 'role'
                ? `${field.label} *`
                : `${field.label} (optional)`
            }
            value={form[field.key as string] ?? ''}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
            className="rounded-lg border border-line bg-app px-3 py-2 text-xs text-fg-primary placeholder:text-fg-tertiary focus:border-teal focus:outline-none"
          />
        ))}
      </div>
      <button
        type="submit"
        disabled={disabled || submitting || !canSubmit}
        className="w-full rounded-lg bg-coral py-2 text-xs font-medium text-white hover:bg-coral-dark disabled:opacity-50"
      >
        {submitting ? 'Launching agent...' : 'Launch agent'}
      </button>
    </form>
  );
}
