import { useState } from 'react';
import { useSessionContext } from '../../context/SessionContext';
import { TraitSlider } from '../reveal/AgentRevealCard';

const BORDER_COLORS = ['border-coral', 'border-teal', 'border-fg-tertiary'];

export function AgentConfigSummary() {
  const { session } = useSessionContext();
  const [open, setOpen] = useState(false);
  const persona = session?.agent_persona;
  const strategy = session?.agent_strategy;

  if (!persona?.name) return null;

  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs text-fg-secondary hover:text-fg-primary"
      >
        Agent config & strategy
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="max-h-64 space-y-4 overflow-y-auto px-4 pb-4 scrollbar-thin">
          <div>
            <p className="font-serif text-sm text-fg-primary">{persona.name}</p>
            <p className="mt-1 text-xs text-fg-secondary">{persona.summary}</p>
          </div>

          {persona.traits && (
            <div className="space-y-3">
              {Object.entries(persona.traits).map(([key, val]) => (
                <TraitSlider key={key} name={key} value={val} />
              ))}
            </div>
          )}

          {persona.vocabulary_do?.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium text-fg-secondary">Uses</p>
              <div className="flex flex-wrap gap-1">
                {persona.vocabulary_do.map((w) => (
                  <span
                    key={w}
                    className="rounded-md bg-teal/10 px-2 py-0.5 text-[11px] text-teal"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {strategy?.steps?.length ? (
            <div>
              <p className="mb-2 text-[11px] font-medium text-fg-secondary">
                Outreach plan
              </p>
              <div className="space-y-2">
                {strategy.steps.map((step, i) => (
                  <div
                    key={step.position}
                    className={`rounded border-l-2 bg-app-secondary/50 py-2 pl-3 ${BORDER_COLORS[i] ?? 'border-line'}`}
                  >
                    <p className="text-[11px] font-medium text-fg-primary">
                      {step.intent}
                    </p>
                    <p className="text-[10px] text-fg-secondary">{step.approach}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
