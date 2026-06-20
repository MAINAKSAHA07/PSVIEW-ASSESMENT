import { useState } from 'react';
import { useProfileContext } from '../../context/ProfileContext';

const EXPERIENCE_OPTIONS = [
  { label: '1-3 years', value: 2 },
  { label: '3-5 years', value: 4 },
  { label: '5-8 years', value: 6 },
  { label: '8+ years', value: 10 },
];

export function CandidateOnboarding() {
  const { profile, updateProfile } = useProfileContext();
  const [currentRole, setCurrentRole] = useState(profile?.current_role ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? '');
  const [skillsText, setSkillsText] = useState(
    (profile?.skills ?? []).join(', '),
  );
  const [experienceYears, setExperienceYears] = useState(
    profile?.experience_years ?? 4,
  );
  const [location, setLocation] = useState(profile?.location ?? '');
  const [openToText, setOpenToText] = useState(
    (profile?.open_to_roles ?? []).join(', '),
  );
  const [availability, setAvailability] = useState(
    profile?.availability ?? 'open',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        current_role: currentRole.trim(),
        linkedin_url: linkedinUrl.trim() || null,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experience_years: experienceYears,
        location: location.trim(),
        open_to_roles: openToText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        availability,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="font-serif text-2xl text-fg-primary">Tell us about yourself</h1>
      <p className="mt-1 text-sm text-fg-secondary">
        This helps match you with the right roles.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs text-fg-secondary">Name</span>
          <input
            value={profile?.full_name ?? ''}
            disabled
            className="mt-1 w-full rounded-lg border border-line bg-app-secondary px-3 py-2 text-sm text-fg-tertiary"
          />
        </label>

        <label className="block">
          <span className="text-xs text-fg-secondary">Current role</span>
          <input
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            placeholder="Senior Engineer at Stripe"
            className="mt-1 w-full rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs text-fg-secondary">LinkedIn URL</span>
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs text-fg-secondary">Skills (comma separated)</span>
          <input
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="React, TypeScript, Node.js"
            className="mt-1 w-full rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs text-fg-secondary">Experience</span>
          <select
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary"
          >
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-fg-secondary">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs text-fg-secondary">Open to (comma separated)</span>
          <input
            value={openToText}
            onChange={(e) => setOpenToText(e.target.value)}
            placeholder="Full-Stack Engineer, Staff Engineer"
            className="mt-1 w-full rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs text-fg-secondary">Status</span>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-app-card px-3 py-2 text-sm text-fg-primary"
          >
            <option value="open">Actively looking</option>
            <option value="casually_looking">Casually browsing</option>
            <option value="not_looking">Just exploring</option>
          </select>
        </label>

        {error && <p className="text-sm text-err">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-coral py-2.5 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Continue to roles'}
        </button>
      </form>
    </div>
  );
}
