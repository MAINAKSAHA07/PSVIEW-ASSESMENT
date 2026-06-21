import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, parseJSON, MODELS } from '../../shared/openai.ts';
import { candidateOutreachPrompt } from '../../shared/prompts.ts';
import { sanitizeObject } from '../../shared/sanitize.ts';
import type {
  AgentPersona,
  AgentStrategy,
  CompanyProfile,
} from '../../shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const MATCH_THRESHOLD = 75;

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

function computeSimpleMatchScore(
  candidateSkills: string[],
  roleText: string,
  techStack: string,
): { score: number; matched: string[] } {
  const haystack = `${roleText} ${techStack}`.toLowerCase();
  const matched: string[] = [];
  for (const skill of candidateSkills) {
    const token = skill.toLowerCase().trim();
    if (token.length > 1 && haystack.includes(token)) {
      matched.push(skill);
    }
  }
  const denom = Math.max(candidateSkills.length, 1);
  const score = Math.min(
    100,
    Math.round((matched.length / denom) * 70 + (matched.length > 0 ? 20 : 0)),
  );
  return { score, matched };
}

async function generateOutreachMessage(
  profile: CompanyProfile,
  persona: AgentPersona,
  strategy: AgentStrategy,
  candidate: Record<string, unknown>,
  matchScore: number,
  matchedSkills: string[],
) {
  const step = strategy.steps?.[0] ?? {
    position: 1,
    intent: 'Introduce role',
    approach: 'Personalized hook',
    tone_target: 'warm professional',
  };

  const candidateProfile = JSON.stringify({
    name: candidate.full_name,
    current_role: candidate.current_role,
    skills: candidate.skills ?? [],
    experience_years: candidate.experience_years,
    location: candidate.location,
    open_to_roles: candidate.open_to_roles ?? [],
  });

  const raw = await callOpenAI(
    MODELS.pipeline,
    candidateOutreachPrompt({
      agentPersona: JSON.stringify(persona),
      companyProfile: JSON.stringify(profile),
      strategyStep: JSON.stringify(step),
      candidateProfile,
      matchScore,
      matchedSkills,
    }),
    'Generate outreach JSON.',
    true,
  );

  return parseJSON<{ message: string }>(raw, () =>
    callOpenAI(
      MODELS.pipeline,
      candidateOutreachPrompt({
        agentPersona: JSON.stringify(persona),
        companyProfile: JSON.stringify(profile),
        strategyStep: JSON.stringify(step),
        candidateProfile,
        matchScore,
        matchedSkills,
      }) + '\nReturn ONLY valid JSON.',
      'Generate outreach JSON.',
      true,
    ),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authClient = getUserClient(req);
    const db = getServiceClient();
    const body = await req.json();
    const { session_id, candidate_id, candidate_ids } = body;

    if (!session_id) throw new Error('session_id is required');

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: session, error: sessErr } = await db
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessErr || !session) throw new Error('Session not found');
    if (session.user_id !== user.id) throw new Error('Access denied');

    const profile: CompanyProfile = session.company_profile ?? {};
    const persona: AgentPersona = session.agent_persona ?? {};
    const strategy: AgentStrategy = session.agent_strategy ?? {};
    const roleText = [
      profile.role,
      profile.ideal_candidate,
      profile.pitch,
      profile.what_they_do,
    ]
      .filter(Boolean)
      .join(' ');
    const techStack = profile.extras?.technology_stack ?? '';

    const targetIds: string[] = candidate_ids?.length
      ? candidate_ids
      : candidate_id
        ? [candidate_id]
        : [];

    if (targetIds.length === 0) {
      throw new Error('candidate_id or candidate_ids is required');
    }

    const clientMatchScores = (body.match_scores ?? {}) as Record<
      string,
      { score?: number; matched_skills?: string[] }
    >;
    const singleMatch = body.match_score as
      | { score?: number; matched_skills?: string[] }
      | undefined;

    const { data: applied } = await db
      .from('candidate_applications')
      .select('candidate_id')
      .eq('session_id', session_id);

    const appliedSet = new Set((applied ?? []).map((a) => a.candidate_id));

    const results: Record<string, unknown>[] = [];

    for (const cid of targetIds) {
      if (appliedSet.has(cid)) {
        results.push({
          candidate_id: cid,
          skipped: true,
          reason: 'already_applied',
        });
        continue;
      }

      const { data: existingOutreach } = await db
        .from('candidate_outreach')
        .select('id, message, sent_at')
        .eq('session_id', session_id)
        .eq('candidate_id', cid)
        .maybeSingle();

      if (existingOutreach && !body.force) {
        results.push({
          candidate_id: cid,
          outreach: existingOutreach,
          reused: true,
        });
        continue;
      }

      const { data: candidate, error: candErr } = await db
        .from('profiles')
        .select('*')
        .eq('id', cid)
        .single();

      if (candErr || !candidate) {
        results.push({ candidate_id: cid, error: 'Candidate not found' });
        continue;
      }

      const skills = (candidate.skills as string[]) ?? [];
      const clientMatch =
        clientMatchScores[cid] ??
        (cid === candidate_id ? singleMatch : undefined);
      const serverMatch = computeSimpleMatchScore(skills, roleText, techStack);
      const score = clientMatch?.score ?? serverMatch.score;
      const matched =
        clientMatch?.matched_skills ?? serverMatch.matched;

      if (score < MATCH_THRESHOLD) {
        results.push({
          candidate_id: cid,
          skipped: true,
          reason: 'below_threshold',
          match_score: score,
        });
        continue;
      }

      const generated = await generateOutreachMessage(
        profile,
        persona,
        strategy,
        candidate,
        score,
        matched,
      );

      const matchPayload = {
        score,
        tier: score >= 80 ? 'strong' : 'good',
        matched_skills: matched,
        missing_skills: [],
        highlights: [`${score}% match for outreach`],
      };

      const { data: outreach, error: outErr } = await db
        .from('candidate_outreach')
        .upsert(
          {
            session_id,
            candidate_id: cid,
            employer_id: user.id,
            match_score: matchPayload,
            status: 'sent',
            message: generated.message,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,candidate_id' },
        )
        .select()
        .single();

      if (outErr) throw new Error(outErr.message);

      results.push({
        candidate_id: cid,
        outreach,
        message: generated.message,
        match_score: matchPayload,
      });
    }

    return new Response(
      JSON.stringify(
        sanitizeObject({
          results,
          preview_only: true,
          note: 'Outreach saved for preview. No email or LinkedIn message was sent.',
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
