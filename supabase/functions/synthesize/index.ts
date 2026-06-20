import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, parseJSON, MODELS } from '../../shared/openai.ts';
import {
  messageGenerationPrompt,
  personaSynthesisPrompt,
  reconciliationPrompt,
  strategyPlanningPrompt,
} from '../../shared/prompts.ts';
import { sanitizeObject } from '../../shared/sanitize.ts';
import type { AgentPersona, AgentStrategy, CompanyProfile } from '../../shared/types.ts';

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

async function reconcileProfile(
  transcript: string,
  profile: CompanyProfile,
): Promise<CompanyProfile> {
  const raw = await callOpenAI(
    MODELS.pipeline,
    reconciliationPrompt(transcript, JSON.stringify(profile)),
    'Produce reconciled profile JSON.',
    true,
  );
  return parseJSON<CompanyProfile>(raw, () =>
    callOpenAI(
      MODELS.pipeline,
      reconciliationPrompt(transcript, JSON.stringify(profile)) +
        '\nReturn ONLY valid JSON.',
      'Produce reconciled profile JSON.',
      true,
    ),
  );
}

async function synthesizePersona(profile: CompanyProfile): Promise<AgentPersona> {
  const raw = await callOpenAI(
    MODELS.pipeline,
    personaSynthesisPrompt(JSON.stringify(profile)),
    'Generate persona JSON.',
    true,
  );
  return parseJSON<AgentPersona>(raw, () =>
    callOpenAI(
      MODELS.pipeline,
      personaSynthesisPrompt(JSON.stringify(profile)) +
        '\nReturn ONLY valid JSON.',
      'Generate persona JSON.',
      true,
    ),
  );
}

async function planStrategy(
  profile: CompanyProfile,
  persona: AgentPersona,
): Promise<AgentStrategy> {
  const raw = await callOpenAI(
    MODELS.pipeline,
    strategyPlanningPrompt(JSON.stringify(profile), JSON.stringify(persona)),
    'Generate strategy JSON.',
    true,
  );
  return parseJSON<AgentStrategy>(raw, () =>
    callOpenAI(
      MODELS.pipeline,
      strategyPlanningPrompt(JSON.stringify(profile), JSON.stringify(persona)) +
        '\nReturn ONLY valid JSON.',
      'Generate strategy JSON.',
      true,
    ),
  );
}

async function generateFirstMessage(
  profile: CompanyProfile,
  persona: AgentPersona,
  strategy: AgentStrategy,
) {
  const step = strategy.steps[0];
  const raw = await callOpenAI(
    MODELS.pipeline,
    messageGenerationPrompt({
      agentPersona: JSON.stringify(persona),
      companyProfile: JSON.stringify(profile),
      currentStrategyStep: JSON.stringify(step),
      conversationHistory: 'No prior messages. This is the opening outreach.',
      candidateAnalysis: 'N/A, opening message',
      strategyAdjustments: 'None',
    }),
    'Generate opening message JSON.',
    true,
  );

  return parseJSON<{ message: string; reasoning: Record<string, unknown> }>(
    raw,
    () =>
      callOpenAI(
        MODELS.pipeline,
        messageGenerationPrompt({
          agentPersona: JSON.stringify(persona),
          companyProfile: JSON.stringify(profile),
          currentStrategyStep: JSON.stringify(step),
          conversationHistory: 'No prior messages.',
          candidateAnalysis: 'N/A',
          strategyAdjustments: 'None',
        }) + '\nReturn ONLY valid JSON.',
        'Generate opening message JSON.',
        true,
      ).then((t) => parseJSON(t, async () => t)),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase(req);
    const { session_id, action = 'full' } = await req.json();

    if (!session_id) throw new Error('session_id is required');

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (error || !session) throw new Error('Session not found');

    const { data: configMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('phase', 'config')
      .order('created_at', { ascending: true });

    const transcript = (configMessages ?? [])
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    let profile: CompanyProfile = session.company_profile ?? {};
    let persona: AgentPersona = session.agent_persona ?? {};
    let strategy: AgentStrategy = session.agent_strategy ?? {};

    if (action === 'full' || action === 'persona') {
      profile = await reconcileProfile(transcript, profile);
      await supabase
        .from('sessions')
        .update({ company_profile: profile })
        .eq('id', session_id);

      persona = await synthesizePersona(profile);
      await supabase
        .from('sessions')
        .update({ agent_persona: persona })
        .eq('id', session_id);
    }

    if (action === 'full' || action === 'strategy') {
      if (!persona.name) {
        persona = await synthesizePersona(profile);
      }
      strategy = await planStrategy(profile, persona);
      await supabase
        .from('sessions')
        .update({ agent_strategy: strategy })
        .eq('id', session_id);
    }

    let firstMessage = { content: '', reasoning: {} as Record<string, unknown> };

    if (action === 'full') {
      const generated = await generateFirstMessage(profile, persona, strategy);
      firstMessage = {
        content: generated.message,
        reasoning: generated.reasoning,
      };

      await supabase.from('messages').insert({
        session_id,
        phase: 'simulation',
        role: 'agent',
        content: generated.message,
        reasoning: generated.reasoning,
      });

      await supabase
        .from('sessions')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('id', session_id);
    }

    const result = {
      agent_persona: persona,
      agent_strategy: strategy,
      first_message: firstMessage,
    };

    return new Response(JSON.stringify(sanitizeObject(result)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
