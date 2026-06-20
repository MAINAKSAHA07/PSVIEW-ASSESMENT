import { SimpleTopBar } from '../components/layout/SimpleTopBar';
import { CandidateDashboard } from '../components/candidate/CandidateDashboard';
import { CandidateOnboarding } from '../components/candidate/CandidateOnboarding';
import { useProfileContext } from '../context/ProfileContext';

export function CandidateMain() {
  const { needsCandidateOnboarding } = useProfileContext();

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <SimpleTopBar />
      {needsCandidateOnboarding ? (
        <CandidateOnboarding />
      ) : (
        <CandidateDashboard />
      )}
    </div>
  );
}
