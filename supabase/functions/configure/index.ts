import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, parseJSON, MODELS } from '../../shared/openai.ts';
import {
  CONFIG_CONVERSATION_PROMPT,
  extractionPrompt,
  uploadExtractionPrompt,
} from '../../shared/prompts.ts';
import { sanitizeObject } from '../../shared/sanitize.ts';
import type { CompanyProfile } from '../../shared/types.ts';
import {
  getProfileGaps,
  isProfileReady,
  mergeExtraction,
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

async function handleChat(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  message: string,
) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) throw new Error('Session not found');

  const profile: CompanyProfile = session.company_profile ?? {};
  const turnCount =
    (
      await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('phase', 'config')
        .eq('role', 'user')
    ).count ?? 0;

  const sourceTag = `turn_${turnCount + 1}`;

  const extractionRaw = await callOpenAI(
    MODELS.utility,
    extractionPrompt(JSON.stringify(profile), message),
    message,
    true,
  );

  const extraction = await parseJSON<{
    updated_fields: Record<string, { value: string; confidence: number }>;
  }>(extractionRaw, () =>
    callOpenAI(
      MODELS.utility,
      extractionPrompt(JSON.stringify(profile), message) +
        '\nReturn ONLY valid JSON.',
      message,
      true,
    ),
  );

  const updatedProfile = mergeExtraction(
    profile,
    extraction.updated_fields ?? {},
    sourceTag,
  );

  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .eq('phase', 'config')
    .order('created_at', { ascending: true });

  const gaps = getProfileGaps(updatedProfile);
  const historyText = (history ?? [])
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const chatContext = `Current profile: ${JSON.stringify(updatedProfile)}
Missing fields: ${gaps.join(', ') || 'none'}
Conversation so far:
${historyText}
User's latest message: ${message}`;

  const agentReply = await callOpenAI(
    MODELS.conversation,
    CONFIG_CONVERSATION_PROMPT,
    chatContext,
  );

  await supabase.from('messages').insert([
    {
      session_id: sessionId,
      phase: 'config',
      role: 'user',
      content: message,
    },
    {
      session_id: sessionId,
      phase: 'config',
      role: 'agent',
      content: agentReply,
    },
  ]);

  const ready =
    isProfileReady(updatedProfile) ||
    agentReply.toLowerCase().includes('ready to see who');

  await supabase
    .from('sessions')
    .update({
      company_profile: updatedProfile,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return {
    agent_reply: agentReply,
    company_profile: updatedProfile,
    ready_to_synthesize: ready,
    gaps,
  };
}

async function handleUpload(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  fileText: string,
) {
  const extractionRaw = await callOpenAI(
    MODELS.pipeline,
    uploadExtractionPrompt(fileText),
    fileText.slice(0, 12000),
    true,
  );

  const profile = await parseJSON<CompanyProfile>(extractionRaw, () =>
    callOpenAI(
      MODELS.pipeline,
      uploadExtractionPrompt(fileText) + '\nReturn ONLY valid JSON.',
      fileText.slice(0, 12000),
      true,
    ),
  );

  if (!profile.field_sources) {
    profile.field_sources = {};
    for (const key of Object.keys(profile)) {
      if (key !== 'field_sources' && key !== 'extras') {
        profile.field_sources[key] = { source: 'uploaded_file', confidence: 0.95 };
      }
    }
  }

  const gaps = getProfileGaps(profile);
  const agentReply =
    gaps.length > 0
      ? `I pulled details from your file. Still need: ${gaps.join(', ')}. Can you fill in those gaps?`
      : 'Got everything I need from your file. Ready to see who I have become?';

  await supabase.from('messages').insert({
    session_id: sessionId,
    phase: 'config',
    role: 'system',
    content: `File uploaded (${fileText.length} chars extracted)`,
  });

  await supabase
    .from('sessions')
    .update({
      company_profile: profile,
      uploaded_file_text: fileText,
      config_source: 'upload',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return {
    agent_reply: agentReply,
    company_profile: profile,
    ready_to_synthesize: isProfileReady(profile),
    gaps,
  };
}

async function handleQuickSetup(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  formData: CompanyProfile,
) {
  const field_sources: CompanyProfile['field_sources'] = {};
  for (const key of Object.keys(formData)) {
    if (key !== 'field_sources' && key !== 'extras') {
      field_sources[key] = { source: 'form', confidence: 1.0 };
    }
  }

  const profile: CompanyProfile = {
    ...formData,
    field_sources,
  };

  await supabase
    .from('sessions')
    .update({
      company_profile: profile,
      config_source: 'quicksetup',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return {
    company_profile: profile,
    ready_to_synthesize: true,
    gaps: [],
  };
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

    let result;
    if (action === 'chat') {
      if (!body.message) throw new Error('message is required');
      result = await handleChat(supabase, session_id, body.message);
    } else if (action === 'upload') {
      if (!body.file_text) throw new Error('file_text is required');
      result = await handleUpload(supabase, session_id, body.file_text);
    } else if (action === 'quicksetup') {
      if (!body.form_data) throw new Error('form_data is required');
      result = await handleQuickSetup(supabase, session_id, body.form_data);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

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
