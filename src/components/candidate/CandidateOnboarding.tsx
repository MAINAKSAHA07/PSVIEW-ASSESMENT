import { useRef, useState } from 'react';
import { useFileParser } from '../../hooks/useFileParser';
import { parseResume } from '../../lib/api';
import { useProfileContext } from '../../context/ProfileContext';

const EXPERIENCE_OPTIONS = [
  { label: '1-3 years', value: 2 },
  { label: '3-5 years', value: 4 },
  { label: '5-8 years', value: 6 },
  { label: '8+ years', value: 10 },
];

function nearestExperienceOption(years: number | null | undefined): number {
  if (!years) return 4;
  return EXPERIENCE_OPTIONS.reduce((best, opt) =>
    Math.abs(opt.value - years) < Math.abs(best.value - years) ? opt : best,
  ).value;
}

export function CandidateOnboarding() {
  const { profile, updateProfile, refreshProfile } = useProfileContext();
  const { extractFileText } = useFileParser();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyParsedProfile = (parsed: {
    current_role?: string | null;
    linkedin_url?: string | null;
    skills?: string[];
    experience_years?: number | null;
    location?: string | null;
    open_to_roles?: string[];
  }) => {
    if (parsed.current_role) setCurrentRole(parsed.current_role);
    if (parsed.linkedin_url) setLinkedinUrl(parsed.linkedin_url);
    if (parsed.skills?.length) setSkillsText(parsed.skills.join(', '));
    if (parsed.experience_years != null) {
      setExperienceYears(nearestExperienceOption(parsed.experience_years));
    }
    if (parsed.location) setLocation(parsed.location);
    if (parsed.open_to_roles?.length) {
      setOpenToText(parsed.open_to_roles.join(', '));
    }
  };

  const handleResumeUpload = async (file: File) => {
    setParsing(true);
    setError(null);
    setParseMessage(`Reading ${file.name}...`);
    setResumeName(file.name);

    try {
      const fileText = await extractFileText(file);
      setParseMessage('Parsing your resume...');
      const { parsed } = await parseResume(fileText);
      applyParsedProfile(parsed);
      await refreshProfile();
      setParseMessage('Profile fields filled from your resume. Review and edit below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume');
      setParseMessage(null);
    } finally {
      setParsing(false);
    }
  };

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
        Upload a resume to auto-fill your profile, or enter details manually.
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-line bg-app-card p-5">
        <p className="text-sm font-medium text-fg-primary">Upload resume</p>
        <p className="mt-1 text-xs text-fg-secondary">
          PDF, DOCX, TXT, or MD — we&apos;ll extract skills, experience, and role info.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleResumeUpload(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={parsing || saving}
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 rounded-lg border border-teal px-4 py-2 text-sm font-medium text-teal hover:bg-teal/10 disabled:opacity-50"
        >
          {parsing ? 'Parsing resume...' : resumeName ? 'Upload another resume' : 'Choose resume file'}
        </button>
        {resumeName && !parsing && (
          <p className="mt-2 text-xs text-fg-tertiary">Last uploaded: {resumeName}</p>
        )}
        {parseMessage && (
          <p className="mt-2 text-xs text-teal">{parseMessage}</p>
        )}
      </div>

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
          disabled={saving || parsing}
          className="w-full rounded-lg bg-coral py-2.5 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Continue to roles'}
        </button>
      </form>
    </div>
  );
}
