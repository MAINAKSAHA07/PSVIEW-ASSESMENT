import { useEffect, useState } from 'react';
import { APP_NAME } from '../lib/constants';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { AppLogo, IconMoon, IconSun } from '../components/ui/Icons';
import { useTheme } from '../context/ThemeContext';

function getAuthErrorFromUrl(): string | null {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return (
    search.get('error_description') ??
    hash.get('error_description') ??
    search.get('error') ??
    hash.get('error')
  );
}

export function Landing() {
  const { isDark, toggleTheme } = useTheme();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const message = getAuthErrorFromUrl();
    if (message) {
      setAuthError(decodeURIComponent(message.replace(/\+/g, ' ')));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <header className="flex items-center justify-between border-b border-line px-6 py-5">
        <div className="flex items-center gap-2">
          <AppLogo className="h-8 w-8 text-xs" />
          <span className="font-serif text-xl text-fg-primary">{APP_NAME}</span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-secondary transition hover:text-fg-primary"
        >
          {isDark ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <h1 className="max-w-2xl font-serif text-4xl leading-tight text-fg-primary sm:text-5xl md:text-6xl">
          Build your recruiting agent
        </h1>
        <p className="mt-4 max-w-lg text-lg text-fg-secondary">
          Configure an autonomous AI agent that engages candidates with your
          company&apos;s personality.
        </p>
        {authError && (
          <p className="mt-6 max-w-lg rounded-lg border border-err/30 bg-err/10 px-4 py-3 text-sm text-err">
            Sign in failed: {authError}
          </p>
        )}
        <div className="mt-10">
          <GoogleSignInButton />
        </div>
      </main>
    </div>
  );
}
