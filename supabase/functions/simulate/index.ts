import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, parseJSON, MODELS } from '../../shared/openai.ts';
import {
  candidateAnalysisPrompt,
  messageGenerationPrompt,
  strategyCheckPrompt,
} from '../../shared/prompts.ts';
import { sanitizeObject } from '../../shared/sanitize.ts';
import type {
  AgentPersona,
  AgentStrategy,
  CompanyProfile,
  ReasoningTrace,
} from '../../shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function getSupabase(req: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    },
  );
}

async function analyzeCandidate(message: string, history: string) {
  const raw = await callOpenAI(
    MODELS.utility,
    candidateAnalysisPrompt(message, history),
    message,
    true,
  );
  return parseJSON<{
    sentiment: string;
    intent: string;
    signals: string[];
  }>(raw, () =>
    callOpenAI(
      MODELS.utility,
      candidateAnalysisPrompt(message, history) + '\nReturn ONLY valid JSON.',
      message,
      true,
    ),
  );
}

async function checkStrategy(
  analysis: string,
  strategy: AgentStrategy,
  position: string,
) {
  const raw = await callOpenAI(
    MODELS.utility,
    strategyCheckPrompt(analysis, JSON.stringify(strategy), position),
    'Analyze strategy adjustment.',
    true,
  );
  return parseJSON<{
    adjustment_needed: boolean;
    adjustment_rationale: string;
    active_playbook: string | null;
  }>(raw, () =>
    callOpenAI(
      MODELS.utility,
      strategyCheckPrompt(analysis, JSON.stringify(strategy), position) +
        '\nReturn ONLY valid JSON.',
      'Analyze strategy adjustment.',
      true,
    ),
  );
}

async function generateResponse(
  persona: AgentPersona,
  profile: CompanyProfile,
  strategy: AgentStrategy,
  history: string,
  candidateAnalysis: Record<string, unknown>,
  strategyCheck: Record<string, unknown>,
) {
  const agentCount = history.split('\n').filter((l) => l.startsWith('agent:')).length;
  const stepIndex = Math.min(agentCount, strategy.steps.length - 1);
  const currentStep = strategy.steps[stepIndex];

  let strategyAdjustments = 'No adjustment needed';
  if (strategyCheck.adjustment_needed) {
    const playbookKey = strategyCheck.active_playbook as string | null;
    const playbookText =
      playbookKey && strategy.objection_playbook[playbookKey]
        ? strategy.objection_playbook[playbookKey]
        : '';
    strategyAdjustments = `${strategyCheck.adjustment_rationale}. Playbook: ${playbookText}`;
  }

  const raw = await callOpenAI(
    MODELS.conversation,
    messageGenerationPrompt({
      agentPersona: JSON.stringify(persona),
      companyProfile: JSON.stringify(profile),
      currentStrategyStep: JSON.stringify(currentStep),
      conversationHistory: history,
      candidateAnalysis: JSON.stringify(candidateAnalysis),
      strategyAdjustments,
    }),
    'Generate response JSON.',
    true,
  );

  return parseJSON<{ message: string; reasoning: ReasoningTrace }>(raw, () =>
    callOpenAI(
      MODELS.conversation,
      messageGenerationPrompt({
        agentPersona: JSON.stringify(persona),
        companyProfile: JSON.stringify(profile),
        currentStrategyStep: JSON.stringify(currentStep),
        conversationHistory: history,
        candidateAnalysis: JSON.stringify(candidateAnalysis),
        strategyAdjustments,
      }) + '\nReturn ONLY valid JSON.',
      'Generate response JSON.',
      true,
    ),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase(req);
    const body = await req.json();
    const { session_id, action } = body;

    if (!session_id || !action) {
      throw new Error('session_id and action are required');
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (error || !session) throw new Error('Session not found');

    const profile: CompanyProfile = session.company_profile ?? {};
    const persona: AgentPersona = session.agent_persona ?? {};
    const strategy: AgentStrategy = session.agent_strategy ?? {};

    if (action === 'reset') {
      await supabase
        .from('messages')
        .delete()
        .eq('session_id', session_id)
        .eq('phase', 'simulation');

      const step = strategy.steps[0];
      const raw = await callOpenAI(
        MODELS.pipeline,
        messageGenerationPrompt({
          agentPersona: JSON.stringify(persona),
          companyProfile: JSON.stringify(profile),
          currentStrategyStep: JSON.stringify(step),
          conversationHistory: 'Reset. Opening message only.',
          candidateAnalysis: 'N/A',
          strategyAdjustments: 'None',
        }),
        'Generate opening message JSON.',
        true,
      );

      const generated = await parseJSON<{
        message: string;
        reasoning: ReasoningTrace;
      }>(raw, () => Promise.resolve(raw).then((t) => t));

      await supabase.from('messages').insert({
        session_id,
        phase: 'simulation',
        role: 'agent',
        content: generated.message,
        reasoning: generated.reasoning,
      });

      return new Response(
        JSON.stringify(
          sanitizeObject({
            agent_message: generated.message,
            reasoning: generated.reasoning,
            candidate_analysis: {
              sentiment: 'neutral',
              intent: 'asking_questions',
              signals: [],
            },
          }),
        ),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action !== 'reply') throw new Error(`Unknown action: ${action}`);

    const candidateMessage = body.candidate_message;
    if (!candidateMessage) throw new Error('candidate_message is required');

    const { data: simMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('phase', 'simulation')
      .order('created_at', { ascending: true });

    const history = (simMessages ?? [])
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const agentCount = (simMessages ?? []).filter((m) => m.role === 'agent').length;
    const position = `Message ${agentCount + 1} of ${strategy.sequence_length ?? 3}`;

    const [candidateAnalysis, strategyCheck] = await Promise.all([
      analyzeCandidate(candidateMessage, history),
      checkStrategy(
        JSON.stringify({ message: candidateMessage }),
        strategy,
        position,
      ),
    ]);

    const generated = await generateResponse(
      persona,
      profile,
      strategy,
      history,
      candidateAnalysis,
      strategyCheck,
    );

    await supabase.from('messages').insert([
      {
        session_id,
        phase: 'simulation',
        role: 'user',
        content: candidateMessage,
      },
      {
        session_id,
        phase: 'simulation',
        role: 'agent',
        content: generated.message,
        reasoning: generated.reasoning,
      },
    ]);

    return new Response(
      JSON.stringify(
        sanitizeObject({
          agent_message: generated.message,
          reasoning: generated.reasoning,
          candidate_analysis: candidateAnalysis,
        }),
      ),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
