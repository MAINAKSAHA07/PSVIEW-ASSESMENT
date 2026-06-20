import { INTEGRATION_PROVIDERS } from '../../lib/constants';
import { IntegrationRow } from './IntegrationRow';

interface IntegrationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function IntegrationsPanel({ open, onClose }: IntegrationsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close integrations panel"
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-app-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <h2 className="font-serif text-xl text-fg-primary">Integrations</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-tertiary hover:text-fg-primary"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {INTEGRATION_PROVIDERS.map((provider) => (
            <IntegrationRow
              key={provider.id}
              name={provider.name}
              badge="Coming Soon"
            />
          ))}
          <IntegrationRow name="Upload CSV" badge="Active" />
        </div>
      </div>
    </div>
  );
}
