import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, parseJSON, MODELS } from '../../shared/openai.ts';
import { resumeExtractionPrompt } from '../../shared/prompts.ts';
import { sanitizeObject } from '../../shared/sanitize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ParsedResume {
  full_name: string | null;
  current_role: string | null;
  linkedin_url: string | null;
  skills: string[];
  experience_years: number | null;
  location: string | null;
  open_to_roles: string[];
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const fileText = body.file_text as string | undefined;

    if (!fileText?.trim()) {
      throw new Error('file_text is required');
    }

    const extractionRaw = await callOpenAI(
      MODELS.pipeline,
      resumeExtractionPrompt(),
      fileText.slice(0, 12000),
      true,
    );

    const parsed = await parseJSON<ParsedResume>(extractionRaw, () =>
      callOpenAI(
        MODELS.pipeline,
        resumeExtractionPrompt() + '\nReturn ONLY valid JSON.',
        fileText.slice(0, 12000),
        true,
      ),
    );

    const profile = {
      full_name: parsed.full_name ?? null,
      current_role: parsed.current_role ?? null,
      linkedin_url: parsed.linkedin_url ?? null,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience_years:
        typeof parsed.experience_years === 'number'
          ? Math.round(parsed.experience_years)
          : null,
      location: parsed.location ?? null,
      open_to_roles: Array.isArray(parsed.open_to_roles)
        ? parsed.open_to_roles
        : [],
      resume_text: fileText.slice(0, 50000),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...profile })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return new Response(
      JSON.stringify(
        sanitizeObject({
          profile: data,
          parsed,
        }),
      ),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
