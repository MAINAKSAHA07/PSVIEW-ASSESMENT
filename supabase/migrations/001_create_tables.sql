-- integrations first (referenced by sessions)
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  credentials JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX idx_integrations_user ON integrations(user_id, provider);

CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'configuring',
  config_source TEXT DEFAULT 'conversation',
  uploaded_file_text TEXT,
  company_profile JSONB DEFAULT '{}',
  agent_persona JSONB DEFAULT '{}',
  agent_strategy JSONB DEFAULT '{}',
  candidate_context JSONB DEFAULT '{}',
  source_integration UUID REFERENCES integrations(id),
  candidate_source JSONB DEFAULT '{}'
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  phase TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  reasoning JSONB
);

CREATE INDEX idx_messages_session ON messages(session_id, phase, created_at);

CREATE TABLE integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  action TEXT NOT NULL,
  direction TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  error TEXT
);

CREATE INDEX idx_integration_logs_integration ON integration_logs(integration_id, created_at);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_messages" ON messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_integrations" ON integrations
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_logs" ON integration_logs
  FOR ALL USING (
    integration_id IN (
      SELECT id FROM integrations WHERE user_id = auth.uid()
    )
  );
