import { useState } from 'react';
import { publishSession, unpublishSession } from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';

export function PublishButton() {
  const { session, setSession, isLoading } = useSessionContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const published = session.is_published ?? false;

  const handleToggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = published
        ? await unpublishSession(session.id)
        : await publishSession(session.id);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy || isLoading}
        className={`rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-50 ${
          published ? 'bg-app-raised text-fg-secondary' : 'bg-teal hover:opacity-90'
        }`}
      >
        {busy
          ? 'Updating...'
          : published
            ? 'Unpublish role'
            : 'Publish role'}
      </button>
      {!published && (
        <p className="text-xs text-fg-tertiary">
          Your agent will engage candidates who apply.
        </p>
      )}
      {error && <p className="text-xs text-err">{error}</p>}
    </div>
  );
}
