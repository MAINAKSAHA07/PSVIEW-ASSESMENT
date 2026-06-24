import { Link } from 'react-router-dom';
import { APP_NAME } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useProfileContext } from '../../context/ProfileContext';
import { AppLogo, IconMoon, IconSun } from '../ui/Icons';

export function SimpleTopBar() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { selectRole } = useProfileContext();
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="flex items-center justify-between gap-2 border-b border-line bg-app px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link to="/app" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <AppLogo />
          <span className="truncate font-serif text-base text-fg-primary sm:text-lg">{APP_NAME}</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void selectRole('employer')}
          className="text-[11px] text-fg-tertiary hover:text-teal sm:text-xs"
        >
          Switch to employer view
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
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full border border-line" />
        ) : null}
        <button
          type="button"
          onClick={() => signOut()}
          className="text-xs text-fg-tertiary hover:text-fg-secondary"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
