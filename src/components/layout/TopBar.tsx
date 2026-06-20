import { useState } from 'react';
import { APP_NAME } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { useSessionContext } from '../../context/SessionContext';
import { IntegrationsPanel } from '../integrations/IntegrationsPanel';

export function TopBar() {
  const { user, signOut } = useAuth();
  const { session } = useSessionContext();
  const [showIntegrations, setShowIntegrations] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const companyName = session?.company_profile?.company_name;

  return (
    <>
      <header className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-coral to-teal">
            <span className="text-[10px] font-bold text-white">A</span>
          </div>
          <span className="font-serif text-lg text-txt-primary">{APP_NAME}</span>
          {companyName && (
            <span className="hidden rounded-md bg-surface-raised px-2 py-0.5 text-xs text-txt-secondary sm:inline">
              {companyName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowIntegrations(true)}
            className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-txt-secondary transition hover:border-teal hover:text-teal"
          >
            Integrations
          </button>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full border border-surface-border"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-xs text-txt-secondary">
              ?
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs text-txt-tertiary hover:text-txt-secondary"
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
