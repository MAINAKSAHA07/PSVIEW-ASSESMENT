import { TRAIT_LABELS } from '../../lib/constants';
import { useSessionContext } from '../../context/SessionContext';

interface TraitSliderProps {
  name: string;
  value: number;
}

export function TraitSlider({ name, value }: TraitSliderProps) {
  const labels = TRAIT_LABELS[name] ?? { low: 'Low', high: 'High' };
  const pct = Math.round(value * 100);

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-fg-secondary">
        <span className="capitalize">{name}</span>
        <span>{pct}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-app-raised">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-teal"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-fg-tertiary">
        <span>{labels.low}</span>
        <span>{labels.high}</span>
      </div>
    </div>
  );
}

export function VocabularyTags({
  doWords,
  dontWords,
}: {
  doWords: string[];
  dontWords: string[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-medium text-fg-secondary">Uses</p>
        <div className="flex flex-wrap gap-1.5">
          {doWords.map((word) => (
            <span
              key={word}
              className="rounded-md px-2 py-0.5 text-xs bg-tag-teal-bg text-tag-teal"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-fg-secondary">Avoids</p>
        <div className="flex flex-wrap gap-1.5">
          {dontWords.map((word) => (
            <span
              key={word}
              className="rounded-md px-2 py-0.5 text-xs bg-tag-error-bg text-tag-error"
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgentRevealCard() {
  const { session } = useSessionContext();
  const persona = session?.agent_persona;
  const companyName = session?.company_profile?.company_name ?? 'your company';

  if (!persona?.name) {
    return null;
  }

  return (
    <div className="rounded-xl border border-line bg-app-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral text-xl font-bold text-[#ECECF1]">
          {persona.name[0]}
        </div>
        <div>
          <h2 className="font-serif text-2xl text-fg-primary">{persona.name}</h2>
          <p className="text-sm text-fg-secondary">Agent for {companyName}</p>
        </div>
      </div>
      <p className="mt-4 italic text-sm leading-relaxed text-fg-secondary">
        {persona.summary}
      </p>
      <div className="mt-6 space-y-4">
        {Object.entries(persona.traits).map(([key, val]) => (
          <TraitSlider key={key} name={key} value={val} />
        ))}
      </div>
      <div className="mt-6">
        <VocabularyTags
          doWords={persona.vocabulary_do}
          dontWords={persona.vocabulary_dont}
        />
      </div>
    </div>
  );
}
