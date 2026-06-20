-- Store computed profile-to-role match when a candidate applies
ALTER TABLE candidate_applications
  ADD COLUMN IF NOT EXISTS match_score JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_applications_match_tier
  ON candidate_applications ((match_score->>'tier'));
