import { useEffect, useState } from 'react';
import { fetchMessages, synthesizeFull } from '../../lib/api';
import { useSessionContext } from '../../context/SessionContext';
import { StepIndicator } from './StepIndicator';

const STEPS = [
  'Analyzing company context...',
  'Synthesizing agent personality...',
  'Planning outreach strategy...',
];

export function SynthesisProgress() {
  const { session, setSession, setPhase, setError, setLoading, setMessages } =
    useSessionContext();
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);

  useEffect(() => {
    if (!session) return;
    const sessionSnapshot = session;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const stepTimer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev < STEPS.length - 1) {
            setDoneSteps((d) => (d.includes(prev) ? d : [...d, prev]));
            return prev + 1;
          }
          return prev;
        });
      }, 2500);

      try {
        const result = await synthesizeFull(sessionSnapshot.id);
        if (cancelled) return;

        clearInterval(stepTimer);
        setDoneSteps([0, 1, 2]);
        setActiveStep(2);

        setSession({
          ...sessionSnapshot,
          status: 'ready',
          agent_persona: result.agent_persona,
          agent_strategy: result.agent_strategy,
        });
        const allMessages = await fetchMessages(sessionSnapshot.id);
        setMessages(allMessages);
        setPhase('ready');
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Synthesis failed',
          );
          setPhase('configuring');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-center font-serif text-2xl text-fg-primary">
          Creating your agent
        </h2>
        <div className="space-y-4 rounded-xl border border-line bg-app-card p-6">
          {STEPS.map((step, i) => (
            <StepIndicator
              key={step}
              label={step}
              status={
                doneSteps.includes(i)
                  ? 'done'
                  : i === activeStep
                    ? 'loading'
                    : 'pending'
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
