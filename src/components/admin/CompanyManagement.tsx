import { useState } from 'react';
import { adminCreateEmployer } from '../../lib/api';
import type { Profile, Session } from '../../lib/types';

interface CompanyManagementProps {
  profiles: Profile[];
  sessions: Session[];
  onRefresh: () => void;
}

export function CompanyManagement({
  profiles,
  sessions,
  onRefresh,
}: CompanyManagementProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const employers = profiles.filter((p) => p.role === 'employer');

  const companies = employers.map((employer) => {
    const employerSessions = sessions.filter((s) => s.user_id === employer.id);
    const names = [
      employer.company_name,
      ...employerSessions.map((s) => s.company_profile?.company_name),
    ].filter(Boolean);
    const displayName = names[0] ?? employer.full_name ?? 'Unnamed company';

    return {
      employer,
      displayName,
      roleCount: employerSessions.length,
      publishedCount: employerSessions.filter((s) => s.is_published).length,
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const company = companyName.trim();
      const contactEmail = email.trim();
      await adminCreateEmployer({
        email: contactEmail,
        full_name: fullName.trim(),
        company_name: company,
      });
      setEmail('');
      setFullName('');
      setCompanyName('');
      setSuccess(`${company} added. They can sign in with Google using ${contactEmail}.`);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="text-sm font-medium text-fg-primary">Company management</h3>
      <p className="mt-1 text-xs text-fg-secondary">
        Add hiring companies and assign an employer account. Users must sign in with Google using the exact email address you enter.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company name"
          required
          className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Contact full name"
          required
          className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Employer email"
          required
          className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-3 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50"
        >
          {saving ? 'Adding company...' : 'Add company'}
        </button>
      </form>

      {error && <p className="mt-3 text-xs text-err">{error}</p>}
      {success && <p className="mt-3 text-xs text-teal">{success}</p>}

      <ul className="mt-5 space-y-2">
        {companies.length === 0 ? (
          <li className="text-sm text-fg-secondary">No companies yet.</li>
        ) : (
          companies.map(({ employer, displayName, roleCount, publishedCount }) => (
            <li
              key={employer.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/60 px-3 py-2 text-sm"
            >
              <div>
                <p className="text-fg-primary">{displayName}</p>
                <p className="text-xs text-fg-tertiary">{employer.email}</p>
              </div>
              <span className="text-xs text-fg-secondary">
                {roleCount} role{roleCount === 1 ? '' : 's'} · {publishedCount} published
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
