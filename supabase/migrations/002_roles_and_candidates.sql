-- Extend sessions for publishing and candidate summary
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS application_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS candidate_summary JSONB DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES sessions(id);

-- Profiles (auto-created on signup via trigger)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  role TEXT,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  company_name TEXT,
  "current_role" TEXT,
  linkedin_url TEXT,
  resume_text TEXT,
  skills JSONB DEFAULT '[]',
  experience_years INTEGER,
  location TEXT,
  open_to_roles JSONB DEFAULT '[]',
  availability TEXT DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
CREATE POLICY "users_insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;
CREATE POLICY "admins_read_all_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Candidate applications
CREATE TABLE IF NOT EXISTS candidate_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  candidate_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  status TEXT DEFAULT 'applied',
  candidate_summary JSONB DEFAULT '{}',
  conversation_session_id UUID REFERENCES sessions(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_candidate ON candidate_applications(candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_applications_session ON candidate_applications(session_id, status);

ALTER TABLE candidate_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidates_own_applications" ON candidate_applications;
CREATE POLICY "candidates_own_applications" ON candidate_applications
  FOR ALL USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS "employers_see_applications" ON candidate_applications;
CREATE POLICY "employers_see_applications" ON candidate_applications
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admins_read_applications" ON candidate_applications;
CREATE POLICY "admins_read_applications" ON candidate_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Updated sessions RLS
DROP POLICY IF EXISTS "users_own_sessions" ON sessions;
DROP POLICY IF EXISTS "employers_own_sessions" ON sessions;
DROP POLICY IF EXISTS "candidates_see_published" ON sessions;
DROP POLICY IF EXISTS "admins_see_all_sessions" ON sessions;
DROP POLICY IF EXISTS "candidates_conversation_sessions" ON sessions;

CREATE POLICY "employers_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "candidates_see_published" ON sessions
  FOR SELECT USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'candidate')
  );

CREATE POLICY "candidates_conversation_sessions" ON sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM candidate_applications ca
      WHERE ca.candidate_id = auth.uid()
      AND ca.conversation_session_id = sessions.id
    )
  );

CREATE POLICY "candidates_create_conv_sessions" ON sessions
  FOR INSERT WITH CHECK (
    parent_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sessions parent
      WHERE parent.id = parent_session_id
      AND parent.is_published = true
    )
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'candidate'
    )
  );

CREATE POLICY "admins_see_all_sessions" ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Allow candidates to read/write simulation messages on their conversation sessions
DROP POLICY IF EXISTS "candidates_app_messages" ON messages;
CREATE POLICY "candidates_app_messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM candidate_applications ca
      WHERE ca.candidate_id = auth.uid()
      AND ca.conversation_session_id = messages.session_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM candidate_applications ca
      WHERE ca.candidate_id = auth.uid()
      AND ca.conversation_session_id = messages.session_id
    )
  );
