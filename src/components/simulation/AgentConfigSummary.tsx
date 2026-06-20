import { useState } from 'react';
import { useSessionContext } from '../../context/SessionContext';

export function AgentConfigSummary() {
  const { session } = useSessionContext();
  const [open, setOpen] = useState(false);
  const persona = session?.agent_persona;

  if (!persona?.name) return null;

  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs text-fg-secondary hover:text-fg-primary"
      >
        Agent config
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 font-mono text-[11px] text-fg-secondary">
          <p className="font-serif text-sm text-fg-primary">{persona.name}</p>
          <p className="mt-1">{persona.summary}</p>
        </div>
      )}
    </div>
  );
}
