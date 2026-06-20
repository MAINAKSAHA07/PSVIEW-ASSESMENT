import { CandidateProfileForm } from './CandidateProfileForm';

export function CandidateProfile() {
  return (
    <div className="mx-auto max-w-lg">
      <CandidateProfileForm submitLabel="Save changes" />
    </div>
  );
}
