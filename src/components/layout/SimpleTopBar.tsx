import { APP_NAME } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { AppLogo, IconMoon, IconSun } from '../ui/Icons';

export function SimpleTopBar() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="flex items-center justify-between border-b border-line bg-app px-4 py-3">
      <div className="flex items-center gap-3">
        <AppLogo />
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
