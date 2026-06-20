import { useState } from 'react';
import { adminCreateCandidate } from '../../lib/api';
import type { Profile } from '../../lib/types';

interface CandidateManagementProps {
  profiles: Profile[];
  onRefresh: () => void;
}

export function CandidateManagement({
  profiles,
  onRefresh,
}: CandidateManagementProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [location, setLocation] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const candidates = profiles.filter((p) => p.role === 'candidate');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const name = fullName.trim();
      await adminCreateCandidate({
        email: email.trim(),
        full_name: name,
        current_role: currentRole.trim() || undefined,
        location: location.trim() || undefined,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setEmail('');
      setFullName('');
      setCurrentRole('');
      setLocation('');
      setSkillsText('');
      setSuccess(`${name} added. They must sign in with Google using ${email.trim()}.`);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add candidate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="text-sm font-medium text-fg-primary">Candidate management</h3>
      <p className="mt-1 text-xs text-fg-secondary">
        Add candidates to the platform and populate their profile for matching.
        Users must sign in with Google using the exact email address you enter here.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          required
          className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <input
          value={currentRole}
          onChange={(e) => setCurrentRole(e.target.value)}
          placeholder="Current role"
          className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <input
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="Skills (comma separated)"
          className="sm:col-span-2 rounded-md border border-line bg-app px-3 py-2 text-sm text-fg-primary"
        />
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50"
        >
          {saving ? 'Adding candidate...' : 'Add candidate'}
        </button>
      </form>

      {error && <p className="mt-3 text-xs text-err">{error}</p>}
      {success && <p className="mt-3 text-xs text-teal">{success}</p>}

      <ul className="mt-5 space-y-2">
        {candidates.length === 0 ? (
          <li className="text-sm text-fg-secondary">No candidates yet.</li>
        ) : (
          candidates.map((candidate) => (
            <li
              key={candidate.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/60 px-3 py-2 text-sm"
            >
              <div>
                <p className="text-fg-primary">
                  {candidate.full_name ?? 'Unnamed candidate'}
                </p>
                <p className="text-xs text-fg-tertiary">
                  {candidate.current_role ?? 'No role set'} · {candidate.email}
                </p>
              </div>
              <span className="text-xs text-fg-secondary">
                {(candidate.skills ?? []).slice(0, 3).join(', ') || 'No skills'}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
