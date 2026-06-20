-- Helper to check admin role without RLS recursion on profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Replace admin read policies with is_admin() and add write access
DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;
CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admins_update_all_profiles" ON profiles;
CREATE POLICY "admins_update_all_profiles" ON profiles
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admins_see_all_sessions" ON sessions;
DROP POLICY IF EXISTS "admins_manage_sessions" ON sessions;
CREATE POLICY "admins_manage_sessions" ON sessions
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admins_read_applications" ON candidate_applications;
DROP POLICY IF EXISTS "admins_manage_applications" ON candidate_applications;
CREATE POLICY "admins_manage_applications" ON candidate_applications
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admins_read_all_messages" ON messages;
DROP POLICY IF EXISTS "admins_manage_messages" ON messages;
CREATE POLICY "admins_read_all_messages" ON messages
  FOR SELECT USING (is_admin());

CREATE POLICY "admins_manage_messages" ON messages
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Promote msaha4@asu.edu to platform admin
INSERT INTO profiles (id, email, role, full_name, avatar_url, updated_at)
SELECT
  u.id,
  u.email,
  'admin',
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url',
  now()
FROM auth.users u
WHERE u.email = 'msaha4@asu.edu'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email,
  updated_at = now();
