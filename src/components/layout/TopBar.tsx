import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useSessionContext } from '../../context/SessionContext';
import { IntegrationsPanel } from '../integrations/IntegrationsPanel';
import { AppLogo, IconMoon, IconSun } from '../ui/Icons';

export function TopBar() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { session } = useSessionContext();
  const location = useLocation();
  const [showIntegrations, setShowIntegrations] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const companyName = session?.company_profile?.company_name;

  return (
    <>
      <header className="flex items-center justify-between border-b border-line bg-app px-4 py-3">
        <div className="flex items-center gap-3">
          <AppLogo />
          <span className="font-serif text-lg text-fg-primary">{APP_NAME}</span>
          {companyName && (
            <span className="hidden rounded-md bg-app-raised px-2 py-0.5 text-xs text-fg-secondary sm:inline">
              {companyName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              !location.pathname.includes('dashboard')
                ? 'bg-coral/10 text-coral'
                : 'text-fg-secondary hover:text-teal'
            }`}
          >
            Configure
          </Link>
          <Link
            to="/app/dashboard"
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              location.pathname.includes('dashboard')
                ? 'bg-teal/10 text-teal'
                : 'text-fg-secondary hover:text-teal'
            }`}
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setShowIntegrations(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary transition hover:border-teal hover:text-teal"
          >
            Integrations
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-full text-fg-secondary transition hover:text-fg-primary"
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full border border-line"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-raised text-xs text-fg-secondary">
              ?
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs text-fg-tertiary hover:text-fg-secondary"
          >
            Sign out
          </button>
        </div>
      </header>
      <IntegrationsPanel
        open={showIntegrations}
        onClose={() => setShowIntegrations(false)}
      />
    </>
  );
}
