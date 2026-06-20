import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeObject } from '../../shared/sanitize.ts';

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

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

async function assertAdmin(req: Request) {
  const supabase = getUserClient(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error('Unauthorized');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return user;
}

function randomPassword(): string {
  return crypto.randomUUID().replace(/-/g, '') + 'Aa1!';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await assertAdmin(req);
    const admin = getAdminClient();
    const body = await req.json();
    const { action } = body;

    if (action === 'create_employer') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const fullName = String(body.full_name ?? '').trim();
      const companyName = String(body.company_name ?? '').trim();

      if (!email || !fullName || !companyName) {
        throw new Error('email, full_name, and company_name are required');
      }

      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password: randomPassword(),
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message ?? 'Failed to create employer account');
      }

      const userId = authData.user.id;

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .upsert({
          id: userId,
          email,
          full_name: fullName,
          company_name: companyName,
          role: 'employer',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) throw new Error(profileError.message);

      const { error: sessionError } = await admin.from('sessions').insert({
        user_id: userId,
        status: 'configuring',
        company_profile: { company_name: companyName },
      });

      if (sessionError) throw new Error(sessionError.message);

      return new Response(JSON.stringify(sanitizeObject({ profile })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create_candidate') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const fullName = String(body.full_name ?? '').trim();
      const currentRole = String(body.current_role ?? '').trim();
      const location = String(body.location ?? '').trim();
      const skills = Array.isArray(body.skills)
        ? body.skills.map(String)
        : String(body.skills ?? '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);

      if (!email || !fullName) {
        throw new Error('email and full_name are required');
      }

      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password: randomPassword(),
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message ?? 'Failed to create candidate account');
      }

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: 'candidate',
          current_role: currentRole || null,
          location: location || null,
          skills,
          availability: 'open',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) throw new Error(profileError.message);

      return new Response(JSON.stringify(sanitizeObject({ profile })), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
