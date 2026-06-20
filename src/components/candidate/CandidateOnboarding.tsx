import { CandidateProfileForm } from './CandidateProfileForm';

export function CandidateOnboarding() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <h1 className="font-serif text-xl text-fg-primary sm:text-2xl">Tell us about yourself</h1>
      <p className="mt-1 text-sm text-fg-secondary">
        Upload a resume to auto-fill your profile, or enter details manually.
      </p>
      <div className="mt-6">
        <CandidateProfileForm
          showIntro={false}
          submitLabel="Continue to roles"
        />
      </div>
    </div>
  );
}
