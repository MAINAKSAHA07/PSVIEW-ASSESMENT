import { useState } from 'react';
import { useProfileContext } from '../../context/ProfileContext';
import type { UserRole } from '../../lib/types';

export function RoleSelector() {
  const { selectRole } = useProfileContext();
  const [loading, setLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (role: UserRole) => {
    setLoading(role);
    setError(null);
    try {
      await selectRole(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app px-6">
      <div className="w-full max-w-lg text-center">
        <h1 className="font-serif text-3xl text-fg-primary">Welcome to AgentForge</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          How will you use the platform?
        </p>

        {error && <p className="mt-4 text-sm text-err">{error}</p>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handleSelect('employer')}
            className="rounded-xl border border-line bg-app-card p-6 text-left transition hover:border-coral disabled:opacity-50"
          >
            <p className="font-medium text-fg-primary">
              {loading === 'employer' ? 'Setting up...' : "I'm hiring"}
            </p>
            <p className="mt-2 text-sm text-fg-secondary">
              Configure an agent to engage candidates
            </p>
          </button>

          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handleSelect('candidate')}
            className="rounded-xl border border-line bg-app-card p-6 text-left transition hover:border-teal disabled:opacity-50"
          >
            <p className="font-medium text-fg-primary">
              {loading === 'candidate' ? 'Setting up...' : "I'm a candidate"}
            </p>
            <p className="mt-2 text-sm text-fg-secondary">
              Explore opportunities and connect with agents
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
