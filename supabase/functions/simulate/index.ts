import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, parseJSON, MODELS } from '../../shared/openai.ts';
import {
  agentActionPrompt,
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

function getUserClient(req: Request) {
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

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

async function assertSessionAccess(
  authClient: ReturnType<typeof createClient>,
  userId: string,
  session: { id: string; user_id: string; parent_session_id?: string | null },
): Promise<'employer' | 'candidate'> {
  if (session.user_id === userId) {
    return 'employer';
  }

  if (session.parent_session_id) {
    const { data: application } = await authClient
      .from('candidate_applications')
      .select('id')
      .eq('conversation_session_id', session.id)
      .eq('candidate_id', userId)
      .maybeSingle();

    if (application) return 'candidate';
  }

  throw new Error('Session not found');
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
    action_requested?: string;
    topics_already_covered?: string[];
    conversation_stage?: string;
    call_already_scheduled?: boolean;
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
    next_goal?: string;
    should_push_for_call?: boolean;
    candidate_readiness?: string;
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

type AgentActionDecision = {
  action: string;
  goal: string;
  rationale: string;
};

async function decideAgentAction(params: {
  profile: CompanyProfile;
  persona: AgentPersona;
  strategy: AgentStrategy;
  history: string;
  candidateAnalysis: Record<string, unknown>;
  strategyCheck: Record<string, unknown>;
  position: string;
}): Promise<AgentActionDecision> {
  const raw = await callOpenAI(
    MODELS.utility,
    agentActionPrompt({
      companyProfile: JSON.stringify(params.profile),
      agentPersona: JSON.stringify(params.persona),
      strategy: JSON.stringify(params.strategy),
      history: params.history,
      candidateAnalysis: JSON.stringify(params.candidateAnalysis),
      strategyCheck: JSON.stringify(params.strategyCheck),
      position: params.position,
    }),
    'Decide next agent action.',
    true,
  );

  return parseJSON<AgentActionDecision>(raw, () =>
    callOpenAI(
      MODELS.utility,
      agentActionPrompt({
        companyProfile: JSON.stringify(params.profile),
        agentPersona: JSON.stringify(params.persona),
        strategy: JSON.stringify(params.strategy),
        history: params.history,
        candidateAnalysis: JSON.stringify(params.candidateAnalysis),
        strategyCheck: JSON.stringify(params.strategyCheck),
        position: params.position,
      }) + '\nReturn ONLY valid JSON.',
      'Decide next agent action.',
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
  delete next.agent_action;
  return next;
}

function buildPartialReasoning(
  candidateAnalysis: Record<string, unknown>,
  strategyCheck: Record<string, unknown>,
  position: string,
  agentAction?: AgentActionDecision,
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
    message_rationale: agentAction
      ? `Next action: ${agentAction.action}. ${agentAction.goal}`
      : 'Deciding next action...',
    strategy_position: position,
    agent_action: agentAction,
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

function buildHistoryFromMessages(
  messages: { role: string; content: string }[],
  excludeLatestCandidateMessage?: string,
): string {
  let rows = messages;
  if (excludeLatestCandidateMessage && rows.length > 0) {
    const last = rows[rows.length - 1];
    if (
      last.role === 'user' &&
      last.content.trim() === excludeLatestCandidateMessage.trim()
    ) {
      rows = rows.slice(0, -1);
    }
  }
  return rows.map((m) => `${m.role}: ${m.content}`).join('\n');
}

function buildGroundedHistory(history: string): string {
  if (!history.trim()) {
    return '[No prior messages yet.]';
  }
  return `${history}\n\n[SYSTEM NOTE: You may ONLY reference names and facts from the COMPANY FACTS section. Do not use names from any other source.]`;
}

function callAlreadyScheduled(history: string): boolean {
  const lower = history.toLowerCase();
  const bookedPhrases = [
    'locked in',
    'works for me',
    'thursday works',
    'friday works',
    'pass your availability',
    'get the invite',
    'coordinate',
    'set up a call',
    'setup a call',
  ];
  const dayConfirmed =
    /\b(monday|tuesday|wednesday|thursday|friday)\b/.test(lower) &&
    (lower.includes('works') || lower.includes('locked') || lower.includes('available'));
  return bookedPhrases.some((p) => lower.includes(p)) || dayConfirmed;
}

function buildStrategyAdjustments(
  strategy: AgentStrategy,
  candidateAnalysis: Record<string, unknown>,
  strategyCheck: Record<string, unknown>,
  history: string,
): string {
  const shouldPushForCall = Boolean(strategyCheck.should_push_for_call);
  const actionRequested = String(candidateAnalysis.action_requested ?? 'none');
  const intent = String(candidateAnalysis.intent ?? '');
  const topicsCovered = Array.isArray(candidateAnalysis.topics_already_covered)
    ? candidateAnalysis.topics_already_covered.map(String)
    : [];
  const nextGoal = strategyCheck.next_goal
    ? String(strategyCheck.next_goal)
    : null;
  const isSubstantiveQuestion =
    intent === 'asking_questions' && actionRequested === 'none';
  const callBooked =
    Boolean(candidateAnalysis.call_already_scheduled) ||
    callAlreadyScheduled(history);

  const isExploratoryInterest =
    (intent === 'expressing_interest' || intent === 'asking_questions') &&
    actionRequested === 'none';

  let strategyAdjustments = 'No adjustment needed';
  if (strategyCheck.adjustment_needed) {
    const playbookKey = strategyCheck.active_playbook as string | null;
    const playbookText =
      playbookKey && strategy.objection_playbook[playbookKey]
        ? strategy.objection_playbook[playbookKey]
        : '';
    strategyAdjustments = `${strategyCheck.adjustment_rationale}. Playbook: ${playbookText}`;
  }

  if (nextGoal && !callBooked && !isSubstantiveQuestion) {
    strategyAdjustments += ` NEXT GOAL: ${nextGoal}.`;
  }

  if (callBooked) {
    strategyAdjustments +=
      ' CALL ALREADY BOOKED: Answer questions directly. Do NOT mention scheduling, calls, invites, or "the hiring manager on the call" unless rescheduling.';
  } else if (isSubstantiveQuestion || isExploratoryInterest) {
    strategyAdjustments +=
      ' ANSWER FULLY from COMPANY FACTS then STOP. Do NOT mention calls, scheduling, or the hiring manager.';
  } else if (shouldPushForCall && actionRequested !== 'none') {
    strategyAdjustments +=
      ' Facilitate the requested action (schedule/connect). Propose a specific time.';
  }

  if (actionRequested && actionRequested !== 'none') {
    strategyAdjustments += ` ACTION REQUESTED: Candidate asked to ${actionRequested}. Facilitate this, do not deflect or claim it is already done.`;
  }

  if (topicsCovered.length > 0) {
    strategyAdjustments += ` ALREADY DISCUSSED (do not repeat): ${topicsCovered.join(', ')}.`;
  }

  const readiness = strategyCheck.candidate_readiness;
  if (
    (readiness === 'already_asked' || readiness === 'ready_to_schedule') &&
    !callBooked &&
    actionRequested !== 'none'
  ) {
    strategyAdjustments +=
      ' CANDIDATE READINESS: High. Facilitate their request, do not re-pitch.';
  }

  return strategyAdjustments;
}

const ACTION_INSTRUCTIONS: Record<string, string> = {
  reply: 'AGENT DECISION (free-running): Continue toward the current strategy goal in a natural way.',
  answer_directly:
    'AGENT DECISION (free-running): Answer fully from COMPANY FACTS. Do not append scheduling or call offers.',
  facilitate_scheduling:
    'AGENT DECISION (free-running): Facilitate scheduling or connection. Propose a concrete next step. Do not claim an invite was sent.',
  handle_objection:
    'AGENT DECISION (free-running): Address the objection directly using company strengths and the playbook.',
  build_interest:
    'AGENT DECISION (free-running): Share specific compelling details about the role or company. One engaging follow-up question at most.',
  graceful_close:
    'AGENT DECISION (free-running): Close warmly. Thank them. Leave the door open. No pressure or scheduling push.',
  ask_one_question:
    'AGENT DECISION (free-running): Ask exactly ONE clarifying question. Keep the message under 3 sentences.',
};

function applyAgentActionAdjustments(
  baseAdjustments: string,
  agentAction: AgentActionDecision,
): string {
  const instruction =
    ACTION_INSTRUCTIONS[agentAction.action] ?? ACTION_INSTRUCTIONS.reply;
  return `${baseAdjustments} ${instruction} GOAL: ${agentAction.goal} RATIONALE: ${agentAction.rationale}`;
}

function pickStrategyStep(
  strategy: AgentStrategy,
  agentCount: number,
  agentAction?: AgentActionDecision,
) {
  const lastIndex = Math.max(strategy.steps.length - 1, 0);
  if (agentAction?.action === 'facilitate_scheduling') {
    return strategy.steps[lastIndex] ?? strategy.steps[0];
  }
  if (agentAction?.action === 'build_interest') {
    return strategy.steps[0] ?? strategy.steps[lastIndex];
  }
  if (agentAction?.action === 'graceful_close') {
    return strategy.steps[lastIndex] ?? strategy.steps[0];
  }
  const stepIndex = Math.min(agentCount, lastIndex);
  return strategy.steps[stepIndex];
}

function enrichReasoningWithAction(
  reasoning: ReasoningTrace,
  agentAction: AgentActionDecision,
): ReasoningTrace {
  return {
    ...reasoning,
    agent_action: agentAction,
    message_rationale: reasoning.message_rationale
      ? `${reasoning.message_rationale} (Action: ${agentAction.action})`
      : `Action: ${agentAction.action}. ${agentAction.goal}`,
  };
}

async function generateResponse(
  persona: AgentPersona,
  profile: CompanyProfile,
  strategy: AgentStrategy,
  history: string,
  candidateAnalysis: Record<string, unknown>,
  strategyCheck: Record<string, unknown>,
  agentAction: AgentActionDecision,
  candidateProfile?: string,
  candidateLatestMessage?: string,
) {
  const agentCount = history.split('\n').filter((l) => l.startsWith('agent:')).length;
  const currentStep = pickStrategyStep(strategy, agentCount, agentAction);

  const baseAdjustments = buildStrategyAdjustments(
    strategy,
    candidateAnalysis,
    strategyCheck,
    history,
  );
  const strategyAdjustments = applyAgentActionAdjustments(
    baseAdjustments,
    agentAction,
  );

  const groundedHistory = buildGroundedHistory(history);

  const promptParams = {
    agentPersona: JSON.stringify(persona),
    companyProfile: JSON.stringify(profile),
    currentStrategyStep: JSON.stringify(currentStep),
    conversationHistory: groundedHistory,
    candidateAnalysis: JSON.stringify(candidateAnalysis),
    strategyAdjustments,
    candidateProfile,
    candidateLatestMessage,
  };

  const raw = await callOpenAI(
    MODELS.conversation,
    messageGenerationPrompt(promptParams),
    'Generate response JSON.',
    true,
  );

  return parseJSON<{ message: string; reasoning: ReasoningTrace }>(raw, () =>
    callOpenAI(
      MODELS.conversation,
      messageGenerationPrompt(promptParams) + '\nReturn ONLY valid JSON.',
      'Generate response JSON.',
      true,
    ),
  ).then((generated) => ({
    ...generated,
    reasoning: enrichReasoningWithAction(generated.reasoning, agentAction),
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authClient = getUserClient(req);
    const db = getServiceClient();
    const body = await req.json();
    const { session_id, action } = body;

    if (!session_id || !action) {
      throw new Error('session_id and action are required');
    }

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) throw new Error('Unauthorized');

    const { data: session, error } = await db
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (error || !session) throw new Error('Session not found');

    await assertSessionAccess(authClient, user.id, session);

    const profile: CompanyProfile = session.company_profile ?? {};
    const persona: AgentPersona = session.agent_persona ?? {};
    const strategy: AgentStrategy = session.agent_strategy ?? {};
    const hideReasoning = shouldHideReasoning(
      body,
      await isCandidateConversationSession(db, session),
    );

    if (action === 'reset') {
      await db
        .from('messages')
        .delete()
        .eq('session_id', session_id)
        .eq('phase', 'simulation');

      const candidateProfile = await loadCandidateProfileText(db, session_id);
      const step = strategy.steps[0];
      const raw = await callOpenAI(
        MODELS.pipeline,
        messageGenerationPrompt({
          agentPersona: JSON.stringify(persona),
          companyProfile: JSON.stringify(profile),
          currentStrategyStep: JSON.stringify(step),
          conversationHistory: buildGroundedHistory('Reset. Opening message only.'),
          candidateAnalysis: 'N/A',
          strategyAdjustments: 'Opening outreach only. Do not push for a call yet.',
          candidateProfile,
          candidateLatestMessage: 'Opening outreach, no candidate message yet.',
        }),
        'Generate opening message JSON.',
        true,
      );

      const generated = await parseJSON<{
        message: string;
        reasoning: ReasoningTrace;
      }>(raw, () => Promise.resolve(raw).then((t) => t));

      await db.from('messages').insert({
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
      const { data: simMessages } = await db
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

      await db
        .from('sessions')
        .update({
          candidate_summary: candidateSummary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session_id);

      const { data: application } = await db
        .from('candidate_applications')
        .select('id')
        .eq('conversation_session_id', session_id)
        .maybeSingle();

      if (application) {
        await db
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

      const { data: simMessages } = await db
        .from('messages')
        .select('role, content')
        .eq('session_id', session_id)
        .eq('phase', 'simulation')
        .order('created_at', { ascending: true });

      const history = buildHistoryFromMessages(
        simMessages ?? [],
        candidateMessage,
      );

      const agentCount = (simMessages ?? []).filter((m) => m.role === 'agent').length;
      const position = `Message ${agentCount + 1} of ${strategy.sequence_length ?? 3}`;

      const candidateAnalysis = await analyzeCandidate(candidateMessage, history);
      const strategyCheck = await checkStrategy(
        JSON.stringify(candidateAnalysis),
        strategy,
        position,
      );
      const agentAction = await decideAgentAction({
        profile,
        persona,
        strategy,
        history: buildGroundedHistory(history),
        candidateAnalysis,
        strategyCheck,
        position,
      });

      const payload: Record<string, unknown> = {
        candidate_analysis: candidateAnalysis,
        strategy_check: strategyCheck,
        agent_action: agentAction,
        reasoning: buildPartialReasoning(
          candidateAnalysis,
          strategyCheck,
          position,
          agentAction,
        ),
      };

      return new Response(
        JSON.stringify(sanitizeObject(publicSimulatePayload(payload, hideReasoning))),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action !== 'reply') throw new Error(`Unknown action: ${action}`);

    const candidateMessage = body.candidate_message;
    if (!candidateMessage) throw new Error('candidate_message is required');

    const { data: simMessages } = await db
      .from('messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('phase', 'simulation')
      .order('created_at', { ascending: true });

    const history = buildHistoryFromMessages(simMessages ?? [], candidateMessage);

    const agentCount = (simMessages ?? []).filter((m) => m.role === 'agent').length;
    const position = `Message ${agentCount + 1} of ${strategy.sequence_length ?? 3}`;

    const preAnalysis = body.pre_analysis as Record<string, unknown> | undefined;
    const preStrategyCheck = body.pre_strategy_check as
      | Record<string, unknown>
      | undefined;

    const candidateAnalysis = preAnalysis
      ? preAnalysis
      : await analyzeCandidate(candidateMessage, history);

    const resolvedStrategyCheck = preStrategyCheck
      ? preStrategyCheck
      : await checkStrategy(JSON.stringify(candidateAnalysis), strategy, position);

    const [candidateProfile, agentAction] = await Promise.all([
      loadCandidateProfileText(db, session_id),
      decideAgentAction({
        profile,
        persona,
        strategy,
        history: buildGroundedHistory(history),
        candidateAnalysis,
        strategyCheck: resolvedStrategyCheck,
        position,
      }),
    ]);

    const generated = await generateResponse(
      persona,
      profile,
      strategy,
      history,
      candidateAnalysis,
      resolvedStrategyCheck,
      agentAction,
      candidateProfile,
      candidateMessage,
    );

    await db.from('messages').insert([
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
              agent_action: agentAction,
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
