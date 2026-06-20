import type { ReasoningTrace } from '../../lib/types';

interface ReasoningBlockProps {
  title: string;
  borderColor: 'teal' | 'coral' | 'gray';
  children: React.ReactNode;
}

const BORDER_MAP = {
  teal: 'border-teal',
  coral: 'border-coral',
  gray: 'border-txt-tertiary',
};

export function ReasoningBlock({ title, borderColor, children }: ReasoningBlockProps) {
  return (
    <div
      className={`rounded-lg border-l-4 bg-[#13131A] p-3 ${BORDER_MAP[borderColor]}`}
    >
      <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-txt-secondary">
        {title}
      </p>
      <div className="mt-2 font-mono text-xs leading-relaxed text-txt-primary">
        {children}
      </div>
    </div>
  );
}

interface ReasoningPanelProps {
  reasoning: ReasoningTrace | null;
  loading?: boolean;
}

export function ReasoningPanel({ reasoning, loading }: ReasoningPanelProps) {
  return (
    <div className="flex h-full flex-col bg-[#13131A]">
      <div className="border-b border-surface-border px-4 py-4">
        <h2 className="flex items-center gap-2 font-serif text-lg text-txt-primary">
          <span className="text-teal">◉</span> Agent reasoning
        </h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-teal animate-pulse">
            Analyzing...
          </div>
        )}
        {reasoning && (
          <>
            <ReasoningBlock title="Candidate analysis" borderColor="teal">
              <p>Sentiment: {reasoning.candidate_analysis.sentiment}</p>
              <p>Intent: {reasoning.candidate_analysis.intent}</p>
              {reasoning.candidate_analysis.signals.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-txt-secondary">
                  {reasoning.candidate_analysis.signals.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </ReasoningBlock>
            <ReasoningBlock title="Strategy shift" borderColor="coral">
              {reasoning.strategy_adjustment}
            </ReasoningBlock>
            <ReasoningBlock title="Persona check" borderColor="gray">
              <p>
                Tone match: {reasoning.persona_check.tone_match ? 'Yes' : 'No'}
              </p>
              <p>
                Vocabulary:{' '}
                {reasoning.persona_check.vocabulary_compliance ? 'Compliant' : 'Review needed'}
              </p>
              <p className="mt-1 text-txt-secondary">
                {reasoning.persona_check.notes}
              </p>
            </ReasoningBlock>
            <p className="font-mono text-[11px] text-txt-tertiary">
              {reasoning.strategy_position}
            </p>
          </>
        )}
        {!loading && !reasoning && (
          <p className="text-sm text-txt-tertiary">
            Reasoning traces appear here after each agent reply.
          </p>
        )}
      </div>
    </div>
  );
}
