import { TwoColumnLayout } from '../components/layout/TwoColumnLayout';
import { ConfigChat } from '../components/config/ConfigChat';
import { ExtractionPanel } from '../components/config/ExtractionPanel';
import { SynthesisProgress } from '../components/synthesis/SynthesisProgress';
import { SimulationView } from '../components/simulation/SimulationView';
import { useSessionContext } from '../context/SessionContext';

export function Main() {
  const { session, phase, isLoading, error } = useSessionContext();

  if (isLoading && !session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-serif text-xl text-fg-primary">Could not start a session</p>
        <p className="max-w-md text-sm text-fg-secondary">
          {error ??
            'The database may not be set up yet. Run the migration in Supabase SQL Editor.'}
        </p>
      </div>
    );
  }

  const inSimulation =
    phase === 'simulating' ||
    phase === 'ready' ||
    session.status === 'simulating' ||
    session.status === 'ready';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {phase === 'configuring' && session && (
        <TwoColumnLayout
          left={<ConfigChat />}
          right={<ExtractionPanel />}
        />
      )}
      {phase === 'synthesizing' && <SynthesisProgress />}
      {inSimulation && session && <SimulationView />}
    </div>
  );
}
