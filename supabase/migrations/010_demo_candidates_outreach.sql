-- Demo candidate pool + employer outreach to high-match candidates (preview only).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.candidate_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES public.profiles(id),
  match_score JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent',
  message TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_outreach_session ON public.candidate_outreach(session_id, sent_at DESC);

ALTER TABLE public.candidate_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employers_manage_outreach" ON public.candidate_outreach;
CREATE POLICY "employers_manage_outreach" ON public.candidate_outreach
  FOR ALL USING (
    public.user_owns_session(session_id)
  )
  WITH CHECK (
    public.user_owns_session(session_id)
    AND employer_id = auth.uid()
  );

DROP POLICY IF EXISTS "candidates_read_own_outreach" ON public.candidate_outreach;
CREATE POLICY "candidates_read_own_outreach" ON public.candidate_outreach
  FOR SELECT USING (candidate_id = auth.uid());

-- Seed demo auth users + profiles (idempotent).
CREATE OR REPLACE FUNCTION public.upsert_demo_candidate(
  p_id uuid,
  p_email text,
  p_full_name text,
  p_current_role text,
  p_skills jsonb,
  p_experience_years integer,
  p_location text,
  p_open_to_roles jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_instance uuid;
BEGIN
  SELECT id INTO v_instance FROM auth.instances LIMIT 1;
  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-0000-0000-000000000000';
  END IF;

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token
  ) VALUES (
    p_id,
    v_instance,
    'authenticated',
    'authenticated',
    p_email,
    crypt('demo-candidate-not-for-login', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    false,
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    email,
    "current_role",
    skills,
    experience_years,
    location,
    open_to_roles,
    availability,
    updated_at
  ) VALUES (
    p_id,
    'candidate',
    p_full_name,
    p_email,
    p_current_role,
    p_skills,
    p_experience_years,
    p_location,
    p_open_to_roles,
    'open',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'candidate',
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    "current_role" = EXCLUDED."current_role",
    skills = EXCLUDED.skills,
    experience_years = EXCLUDED.experience_years,
    location = EXCLUDED.location,
    open_to_roles = EXCLUDED.open_to_roles,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_candidates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000001'::uuid,
    'priya.sharma@psview.demo',
    'Priya Sharma',
    'Senior Full-Stack Engineer at Stripe',
    '["React","TypeScript","Node.js","AWS","PostgreSQL","Docker"]'::jsonb,
    6,
    'San Francisco, CA',
    '["Senior Full-Stack Engineer","Staff Engineer"]'::jsonb
  );
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000002'::uuid,
    'marcus.chen@psview.demo',
    'Marcus Chen',
    'Optimization Engineer at Google',
    '["Python","C++","constraint programming","optimization","PostgreSQL","AWS"]'::jsonb,
    8,
    'New York, NY',
    '["Backend Engineer","Optimization Systems Engineer"]'::jsonb
  );
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000003'::uuid,
    'elena.rodriguez@psview.demo',
    'Elena Rodriguez',
    'Frontend Developer at Shopify',
    '["React","JavaScript","TypeScript","CSS","Tailwind"]'::jsonb,
    4,
    'Austin, TX',
    '["Frontend Engineer","Full-Stack Engineer"]'::jsonb
  );
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000004'::uuid,
    'james.okafor@psview.demo',
    'James Okafor',
    'Junior Web Developer',
    '["HTML","CSS","JavaScript"]'::jsonb,
    1,
    'Chicago, IL',
    '["Junior Developer"]'::jsonb
  );
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000005'::uuid,
    'aisha.patel@psview.demo',
    'Aisha Patel',
    'Platform Engineer at Siemens',
    '["React","Node.js","TypeScript","AWS","IoT","BACnet","Docker","Kubernetes"]'::jsonb,
    7,
    'Boston, MA',
    '["Senior Full-Stack Engineer","Platform Engineer"]'::jsonb
  );
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000006'::uuid,
    'david.kim@psview.demo',
    'David Kim',
    'Data Analyst at Meta',
    '["Python","SQL","Tableau","PostgreSQL","data visualization"]'::jsonb,
    5,
    'Seattle, WA',
    '["Data Engineer","Analytics Engineer"]'::jsonb
  );
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000007'::uuid,
    'jordan.lee@psview.demo',
    'Jordan Lee',
    'Full-Stack Engineer at Razorpay',
    '["React","TypeScript","Node.js","MongoDB","Vite","Supabase","Docker","REST"]'::jsonb,
    5,
    'Bangalore, India',
    '["Full-Stack Engineer","Senior Engineer"]'::jsonb
  );
  PERFORM public.upsert_demo_candidate(
    'a1000001-0001-4001-8001-000000000008'::uuid,
    'sakshi.mehta@psview.demo',
    'Sakshi Mehta',
    'Software Engineer at Freshworks',
    '["React","JavaScript","Node.js","PostgreSQL","Git"]'::jsonb,
    3,
    'Chennai, India',
    '["Full-Stack Engineer"]'::jsonb
  );
END;
$$;

SELECT public.seed_demo_candidates();

-- Include outreach records in applicant pool response.
CREATE OR REPLACE FUNCTION public.get_session_applicant_pool(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id uuid := auth.uid();
  v_session public.sessions%ROWTYPE;
BEGIN
  IF v_employer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.user_id IS DISTINCT FROM v_employer_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'applications', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
        FROM public.candidate_applications a
        WHERE a.session_id = p_session_id
      ),
      '[]'::jsonb
    ),
    'candidates', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(p))
        FROM public.profiles p
        WHERE p.role = 'candidate'
          AND (
            COALESCE(jsonb_array_length(p.skills), 0) > 0
            OR p.current_role IS NOT NULL
            OR p.resume_text IS NOT NULL
          )
      ),
      '[]'::jsonb
    ),
    'outreach', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(o) ORDER BY o.sent_at DESC)
        FROM public.candidate_outreach o
        WHERE o.session_id = p_session_id
      ),
      '[]'::jsonb
    )
  );
END;
$$;
