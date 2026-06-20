import { useState } from 'react';
import { APP_NAME } from '../../lib/constants';
import { useAuthContext } from '../../context/AuthContext';
import { useProfileContext } from '../../context/ProfileContext';
import { useTheme } from '../../context/ThemeContext';
import { AppLogo, IconMoon, IconSun } from '../ui/Icons';
import type { UserRole } from '../../lib/types';

export function RoleSelector() {
  const { user, signOut, firstName } = useAuthContext();
  const { selectRole } = useProfileContext();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (role: 'employer' | 'candidate') => {
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
    <div className="flex min-h-screen flex-col bg-app">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-2">
          <AppLogo className="h-8 w-8 text-xs" />
          <span className="font-serif text-lg text-fg-primary">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-full text-fg-secondary transition hover:text-fg-primary"
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs text-fg-tertiary hover:text-fg-secondary"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl text-center">
          <p className="text-sm text-teal">Signed in as {user?.email}</p>
          <h1 className="mt-3 font-serif text-3xl text-fg-primary md:text-4xl">
            Welcome, {firstName}
          </h1>
          <p className="mt-3 text-base text-fg-secondary">
            How do you want to use AgentForge today?
          </p>
          <p className="mt-1 text-sm text-fg-tertiary">
            Choose employer to configure agents, or candidate to browse roles.
          </p>

          {error && <p className="mt-4 text-sm text-err">{error}</p>}

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleSelect('employer')}
              className="rounded-xl border border-line bg-app-card p-6 text-left transition hover:border-coral hover:shadow-sm disabled:opacity-50"
            >
              <p className="text-lg font-medium text-fg-primary">
                {loading === 'employer' ? 'Setting up...' : 'Employer'}
              </p>
              <p className="mt-2 text-sm text-fg-secondary">
                I&apos;m hiring. Configure an AI agent to engage candidates.
              </p>
            </button>

            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleSelect('candidate')}
              className="rounded-xl border border-line bg-app-card p-6 text-left transition hover:border-teal hover:shadow-sm disabled:opacity-50"
            >
              <p className="text-lg font-medium text-fg-primary">
                {loading === 'candidate' ? 'Setting up...' : 'Candidate'}
              </p>
              <p className="mt-2 text-sm text-fg-secondary">
                I&apos;m job hunting. Browse roles and talk to recruiting agents.
              </p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
