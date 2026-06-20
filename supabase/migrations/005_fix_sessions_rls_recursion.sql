-- Fix infinite RLS recursion on sessions (policies must not query sessions directly)

CREATE OR REPLACE FUNCTION public.is_published_session(session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = session_id AND is_published = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_session(session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = session_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_candidate()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'candidate'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_published_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_candidate() TO authenticated;

-- Sessions: stop self-referential subquery on INSERT
DROP POLICY IF EXISTS "candidates_create_conv_sessions" ON sessions;
CREATE POLICY "candidates_create_conv_sessions" ON sessions
  FOR INSERT WITH CHECK (
    parent_session_id IS NOT NULL
    AND is_published_session(parent_session_id)
    AND is_candidate()
  );

-- Sessions: use helper instead of profiles subquery
DROP POLICY IF EXISTS "candidates_see_published" ON sessions;
CREATE POLICY "candidates_see_published" ON sessions
  FOR SELECT USING (
    is_published = true AND is_candidate()
  );

-- Messages: stop querying sessions from within messages RLS
DROP POLICY IF EXISTS "users_own_messages" ON messages;
CREATE POLICY "users_own_messages" ON messages
  FOR ALL USING (user_owns_session(session_id))
  WITH CHECK (user_owns_session(session_id));

-- Applications: stop querying sessions from within applications RLS
DROP POLICY IF EXISTS "employers_see_applications" ON candidate_applications;
CREATE POLICY "employers_see_applications" ON candidate_applications
  FOR SELECT USING (user_owns_session(session_id));

-- Profiles: stop joining sessions inside profiles RLS
DROP POLICY IF EXISTS "employers_read_applicant_profiles" ON profiles;
CREATE OR REPLACE FUNCTION public.employer_can_read_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidate_applications ca
    INNER JOIN public.sessions s ON s.id = ca.session_id
    WHERE ca.candidate_id = profile_id
      AND s.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.employer_can_read_profile(uuid) TO authenticated;

CREATE POLICY "employers_read_applicant_profiles" ON profiles
  FOR SELECT USING (employer_can_read_profile(id));

-- Split employer vs admin session policies to avoid overlapping FOR ALL checks
DROP POLICY IF EXISTS "employers_own_sessions" ON sessions;
CREATE POLICY "employers_own_sessions" ON sessions
  FOR ALL
  USING (auth.uid() = user_id AND NOT is_admin())
  WITH CHECK (auth.uid() = user_id AND NOT is_admin());
