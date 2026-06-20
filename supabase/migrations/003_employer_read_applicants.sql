-- Employers can read profiles of candidates who applied to their sessions
DROP POLICY IF EXISTS "employers_read_applicant_profiles" ON profiles;
CREATE POLICY "employers_read_applicant_profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT ca.candidate_id FROM candidate_applications ca
      JOIN sessions s ON s.id = ca.session_id
      WHERE s.user_id = auth.uid()
    )
  );
