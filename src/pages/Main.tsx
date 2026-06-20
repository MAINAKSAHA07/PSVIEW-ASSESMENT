import { TwoColumnLayout } from '../components/layout/TwoColumnLayout';
import { TopBar } from '../components/layout/TopBar';
import { ConfigChat } from '../components/config/ConfigChat';
import { ExtractionPanel } from '../components/config/ExtractionPanel';
import { SynthesisProgress } from '../components/synthesis/SynthesisProgress';
import { AgentRevealCard } from '../components/reveal/AgentRevealCard';
import { StrategyPlanCard } from '../components/reveal/StrategyPlanCard';
import { SimulationView } from '../components/simulation/SimulationView';
import { useSessionContext } from '../context/SessionContext';

export function Main() {
  const { session, phase, isLoading } = useSessionContext();

  if (isLoading && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        {phase === 'configuring' && session && (
          <TwoColumnLayout
            left={<ConfigChat />}
            right={<ExtractionPanel />}
          />
        )}
        {phase === 'synthesizing' && <SynthesisProgress />}
        {phase === 'ready' && session && (
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <AgentRevealCard />
              <StrategyPlanCard />
            </div>
          </div>
        )}
        {phase === 'simulating' && session && <SimulationView />}
      </div>
    </div>
  );
}
