import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, parseJSON, MODELS } from '../../shared/openai.ts';
import {
  candidateAnalysisPrompt,
  candidateSummaryPrompt,
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

async function isCandidateConversationSession(
  supabase: ReturnType<typeof createClient>,
  session: { id: string; parent_session_id?: string | null },
): Promise<boolean> {
  if (!session.parent_session_id) return false;
  const { data } = await supabase
    .from('candidate_applications')
    .select('id')
    .eq('conversation_session_id', session.id)
    .maybeSingle();
  return Boolean(data);
}

function shouldHideReasoning(
  body: Record<string, unknown>,
  isCandidateSession: boolean,
): boolean {
  return body.hide_reasoning === true || isCandidateSession;
}

function publicSimulatePayload(
  payload: Record<string, unknown>,
  hideReasoning: boolean,
): Record<string, unknown> {
  if (!hideReasoning) return payload;
  const next = { ...payload };
  delete next.reasoning;
  delete next.candidate_analysis;
  delete next.strategy_check;
  return next;
}

function buildPartialReasoning(
  candidateAnalysis: Record<string, unknown>,
  strategyCheck: Record<string, unknown>,
  position: string,
): ReasoningTrace {
  return {
    candidate_analysis: {
      sentiment: String(candidateAnalysis.sentiment ?? 'neutral'),
      intent: String(candidateAnalysis.intent ?? 'asking_questions'),
      signals: Array.isArray(candidateAnalysis.signals)
        ? candidateAnalysis.signals.map(String)
        : [],
    },
    strategy_adjustment: strategyCheck.adjustment_needed
      ? String(strategyCheck.adjustment_rationale ?? 'Adjusting strategy...')
      : 'Analyzing strategy fit...',
    persona_check: {
      tone_match: true,
      vocabulary_compliance: true,
      notes: 'Generating response...',
    },
    message_rationale: 'Crafting the next message...',
    strategy_position: position,
  };
}

async function loadCandidateProfileText(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
): Promise<string | undefined> {
  const { data: app } = await supabase
    .from('candidate_applications')
    .select('candidate_id')
    .eq('conversation_session_id', sessionId)
    .maybeSingle();

  if (!app?.candidate_id) return undefined;

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, current_role, skills, experience_years, location, open_to_roles, resume_text',
    )
    .eq('id', app.candidate_id)
    .maybeSingle();

  if (!profile) return undefined;

  return JSON.stringify({
    name: profile.full_name,
    current_role: profile.current_role,
    skills: profile.skills ?? [],
    experience_years: profile.experience_years,
    location: profile.location,
    open_to_roles: profile.open_to_roles ?? [],
    resume_excerpt: profile.resume_text?.slice(0, 1500) ?? null,
  });
}

async function generateResponse(
  persona: AgentPersona,
  profile: CompanyProfile,
  strategy: AgentStrategy,
  history: string,
  candidateAnalysis: Record<string, unknown>,
  strategyCheck: Record<string, unknown>,
  candidateProfile?: string,
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
      candidateProfile,
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
        candidateProfile,
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
    const hideReasoning = shouldHideReasoning(
      body,
      await isCandidateConversationSession(supabase, session),
    );

    if (action === 'reset') {
      await supabase
        .from('messages')
        .delete()
        .eq('session_id', session_id)
        .eq('phase', 'simulation');

      const candidateProfile = await loadCandidateProfileText(supabase, session_id);
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
          candidateProfile,
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
          sanitizeObject(
            publicSimulatePayload(
              {
                agent_message: generated.message,
                reasoning: generated.reasoning,
                candidate_analysis: {
                  sentiment: 'neutral',
                  intent: 'asking_questions',
                  signals: [],
                },
              },
              hideReasoning,
            ),
          ),
        ),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'summarize') {
      const { data: simMessages } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', session_id)
        .eq('phase', 'simulation')
        .order('created_at', { ascending: true });

      const conversationText = (simMessages ?? [])
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const userTurns = (simMessages ?? []).filter((m) => m.role === 'user').length;

      const raw = await callOpenAI(
        MODELS.conversation,
        candidateSummaryPrompt(
          JSON.stringify(profile),
          JSON.stringify(persona),
          conversationText || 'No messages yet.',
        ),
        'Generate candidate summary JSON.',
        true,
      );

      const summary = await parseJSON<Record<string, unknown>>(raw, () =>
        callOpenAI(
          MODELS.conversation,
          candidateSummaryPrompt(
            JSON.stringify(profile),
            JSON.stringify(persona),
            conversationText || 'No messages yet.',
          ) + '\nReturn ONLY valid JSON.',
          'Generate candidate summary JSON.',
          true,
        ),
      );

      const candidateSummary = {
        ...summary,
        conversation_turns: userTurns,
      };

      await supabase
        .from('sessions')
        .update({
          candidate_summary: candidateSummary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session_id);

      const { data: application } = await supabase
        .from('candidate_applications')
        .select('id')
        .eq('conversation_session_id', session_id)
        .maybeSingle();

      if (application) {
        await supabase
          .from('candidate_applications')
          .update({ candidate_summary: candidateSummary })
          .eq('id', application.id);
      }

      return new Response(
        JSON.stringify(sanitizeObject({ candidate_summary: candidateSummary })),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'analyze') {
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

      const payload: Record<string, unknown> = {
        candidate_analysis: candidateAnalysis,
        strategy_check: strategyCheck,
        reasoning: buildPartialReasoning(candidateAnalysis, strategyCheck, position),
      };

      return new Response(
        JSON.stringify(sanitizeObject(publicSimulatePayload(payload, hideReasoning))),
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

    const preAnalysis = body.pre_analysis as Record<string, unknown> | undefined;
    const preStrategyCheck = body.pre_strategy_check as
      | Record<string, unknown>
      | undefined;

    const [candidateAnalysis, strategyCheck, candidateProfile] = await Promise.all([
      preAnalysis
        ? Promise.resolve(preAnalysis)
        : analyzeCandidate(candidateMessage, history),
      preStrategyCheck
        ? Promise.resolve(preStrategyCheck)
        : checkStrategy(
            JSON.stringify({ message: candidateMessage }),
            strategy,
            position,
          ),
      loadCandidateProfileText(supabase, session_id),
    ]);

    const generated = await generateResponse(
      persona,
      profile,
      strategy,
      history,
      candidateAnalysis,
      strategyCheck,
      candidateProfile,
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
        sanitizeObject(
          publicSimulatePayload(
            {
              agent_message: generated.message,
              reasoning: generated.reasoning,
              candidate_analysis: candidateAnalysis,
            },
            hideReasoning,
          ),
        ),
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
