import { SimpleTopBar } from '../components/layout/SimpleTopBar';
import { CandidateDashboard } from '../components/candidate/CandidateDashboard';
import { CandidateOnboarding } from '../components/candidate/CandidateOnboarding';
import { useProfileContext } from '../context/ProfileContext';

export function CandidateMain() {
  const { needsCandidateOnboarding } = useProfileContext();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app">
      <SimpleTopBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {needsCandidateOnboarding ? (
          <CandidateOnboarding />
        ) : (
          <CandidateDashboard />
        )}
      </div>
    </div>
  );
}
