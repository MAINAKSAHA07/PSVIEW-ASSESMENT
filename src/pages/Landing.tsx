import { APP_NAME } from '../lib/constants';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { AppLogo, IconMoon, IconSun } from '../components/ui/Icons';
import { useTheme } from '../context/ThemeContext';

export function Landing() {
  const { isDark, toggleTheme } = useTheme();

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
        <h1 className="max-w-2xl font-serif text-5xl leading-tight text-fg-primary md:text-6xl">
          Build your recruiting agent
        </h1>
        <p className="mt-4 max-w-lg text-lg text-fg-secondary">
          Configure an autonomous AI agent that engages candidates with your
          company&apos;s personality.
        </p>
        <div className="mt-10">
          <GoogleSignInButton />
        </div>
      </main>
    </div>
  );
}
