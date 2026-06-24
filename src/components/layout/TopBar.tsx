import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useSessionContext } from '../../context/SessionContext';
import { useProfileContext } from '../../context/ProfileContext';
import { IntegrationsPanel } from '../integrations/IntegrationsPanel';
import { AppLogo, IconMoon, IconSun } from '../ui/Icons';

export function TopBar() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { session } = useSessionContext();
  const { selectRole } = useProfileContext();
  const location = useLocation();
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const companyName = session?.company_profile?.company_name;

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-line bg-app px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <AppLogo />
          <span className="truncate font-serif text-base text-fg-primary sm:text-lg">
            {APP_NAME}
          </span>
          {companyName && (
            <span className="hidden max-w-[8rem] truncate rounded-md bg-app-raised px-2 py-0.5 text-xs text-fg-secondary md:inline lg:max-w-[12rem]">
              {companyName}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Link
            to="/app"
            className={`rounded-lg px-2 py-1.5 text-[11px] sm:px-3 sm:text-xs transition ${
              !location.pathname.includes('dashboard')
                ? 'bg-coral/10 text-coral'
                : 'text-fg-secondary hover:text-teal'
            }`}
          >
            Configure
          </Link>
          <Link
            to="/app/dashboard"
            className={`rounded-lg px-2 py-1.5 text-[11px] sm:px-3 sm:text-xs transition ${
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
            className="hidden rounded-lg border border-line px-3 py-1.5 text-xs text-fg-secondary transition hover:border-teal hover:text-teal sm:inline-block"
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="text-[11px] text-fg-tertiary hover:text-fg-secondary sm:text-xs"
              aria-expanded={showMenu}
            >
              Account
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-line bg-app-card py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    void selectRole('candidate');
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-fg-secondary hover:bg-app-raised hover:text-teal"
                >
                  Switch to candidate view
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    void signOut();
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-fg-secondary hover:bg-app-raised"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <IntegrationsPanel
        open={showIntegrations}
        onClose={() => setShowIntegrations(false)}
      />
    </>
  );
}
