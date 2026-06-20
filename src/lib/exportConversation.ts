import type { CandidateSummary, Message, ReasoningTrace } from './types';

function formatReasoning(reasoning: ReasoningTrace | null | undefined): string {
  if (!reasoning) return '';
  const lines = [
    '### Agent reasoning',
    `- Sentiment: ${reasoning.candidate_analysis?.sentiment ?? 'n/a'}`,
    `- Intent: ${reasoning.candidate_analysis?.intent ?? 'n/a'}`,
    `- Signals: ${(reasoning.candidate_analysis?.signals ?? []).join('; ') || 'none'}`,
    `- Strategy: ${reasoning.strategy_adjustment ?? 'n/a'}`,
    `- Rationale: ${reasoning.message_rationale ?? 'n/a'}`,
    `- Position: ${reasoning.strategy_position ?? 'n/a'}`,
  ];
  return lines.join('\n');
}

export function formatConversationMarkdown(params: {
  companyName: string;
  roleTitle: string;
  agentName: string;
  messages: Message[];
  summary?: CandidateSummary | null;
}): string {
  const { companyName, roleTitle, agentName, messages, summary } = params;
  const header = [
    `# ${companyName} — ${roleTitle}`,
    '',
    `Agent: ${agentName}`,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    '---',
    '',
  ].join('\n');

  const body = messages
    .map((message) => {
      const speaker =
        message.role === 'agent' ? agentName : message.role === 'user' ? 'Candidate' : message.role;
      const reasoning =
        message.role === 'agent' && message.reasoning
          ? `\n\n${formatReasoning(message.reasoning)}`
          : '';
      return `**${speaker}:** ${message.content}${reasoning}`;
    })
    .join('\n\n');

  const summaryBlock =
    summary && summary.interest_level
      ? [
          '',
          '---',
          '',
          '## Candidate summary',
          `- Interest: ${summary.interest_level} — ${summary.interest_label ?? ''}`,
          `- Motivators: ${(summary.key_motivators ?? []).join('; ')}`,
          `- Concerns: ${(summary.concerns ?? []).join('; ')}`,
          `- Next step: ${summary.recommended_next_step ?? 'n/a'}`,
        ].join('\n')
      : '';

  return `${header}${body}${summaryBlock}\n`;
}

export async function copyConversationMarkdown(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown);
}
