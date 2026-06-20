import { useState } from 'react';
import { startCandidateConversation } from '../../lib/api';
import { useAuthContext } from '../../context/AuthContext';
import type { CandidateApplication } from '../../lib/types';
import { AgentConversation } from './AgentConversation';
import { MyApplications } from './MyApplications';
import { RoleBrowser } from './RoleBrowser';

type Tab = 'browse' | 'applications';

export function CandidateDashboard() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<Tab>('browse');
  const [activeApp, setActiveApp] = useState<CandidateApplication | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTalk = async (sessionId: string) => {
    if (!user) return;
    setStartingId(sessionId);
    setError(null);
    try {
      const app = await startCandidateConversation(sessionId, user.id);
      setActiveApp(app);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setStartingId(null);
    }
  };

  if (activeApp) {
    return (
      <AgentConversation
        application={activeApp}
        onBack={() => setActiveApp(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl flex-1 overflow-y-auto p-6">
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('browse')}
          className={`rounded-lg px-4 py-2 text-sm ${
            tab === 'browse'
              ? 'bg-coral text-white'
              : 'border border-line text-fg-secondary'
          }`}
        >
          Browse roles
        </button>
        <button
          type="button"
          onClick={() => setTab('applications')}
          className={`rounded-lg px-4 py-2 text-sm ${
            tab === 'applications'
              ? 'bg-coral text-white'
              : 'border border-line text-fg-secondary'
          }`}
        >
          My applications
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-err">{error}</p>}

      {tab === 'browse' ? (
        <RoleBrowser onTalk={handleTalk} startingId={startingId} />
      ) : (
        <MyApplications />
      )}
    </div>
  );
}
