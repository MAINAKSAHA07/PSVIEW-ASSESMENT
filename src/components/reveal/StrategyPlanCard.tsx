import { updateSessionStatus, resetSessionForReconfigure } from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';

const BORDER_COLORS = ['border-coral', 'border-teal', 'border-fg-tertiary'];

export function StrategyPlanCard() {
  const { session, setSession, setPhase } = useSessionContext();
  const strategy = session?.agent_strategy;

  const handleStart = async () => {
    if (!session) return;
    await updateSessionStatus(session.id, 'simulating');
    setSession({ ...session, status: 'simulating' });
    setPhase('simulating');
  };

  const handleReconfigure = async () => {
    if (!session) return;
    await resetSessionForReconfigure(session.id);
    setSession({
      ...session,
      status: 'configuring',
      company_profile: {},
      agent_persona: {} as typeof session.agent_persona,
      agent_strategy: {} as typeof session.agent_strategy,
    });
    setPhase('configuring');
  };

  if (!strategy?.steps?.length) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-app-card p-6">
        <h3 className="font-serif text-xl text-fg-primary">Outreach strategy</h3>
        <div className="mt-4 space-y-3">
          {strategy.steps.map((step, i) => (
            <div
              key={step.position}
              className={`rounded-lg border-l-4 bg-app p-4 ${BORDER_COLORS[i] ?? 'border-line'}`}
            >
              <p className="text-xs font-medium text-fg-tertiary">
                Message {step.position}
              </p>
              <p className="mt-1 text-sm font-medium text-fg-primary">
                {step.intent}
              </p>
              <p className="mt-1 text-xs text-fg-secondary">{step.approach}</p>
              <p className="mt-2 text-[11px] text-teal">{step.tone_target}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleStart}
          className="flex-1 rounded-lg bg-coral py-3 text-sm font-medium text-white hover:bg-coral-dark"
        >
          Start conversation
        </button>
        <button
          type="button"
          onClick={handleReconfigure}
          className="rounded-lg border border-line px-4 py-3 text-sm text-fg-secondary hover:border-coral hover:text-coral"
        >
          Reconfigure
        </button>
      </div>
    </div>
  );
}
