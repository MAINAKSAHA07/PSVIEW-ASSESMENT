-- Allow candidates to start conversations without hitting sessions INSERT/SELECT RLS edge cases.
-- Conversation sessions use the employer's user_id, so direct client inserts often fail on RETURNING.

CREATE OR REPLACE FUNCTION public.start_candidate_conversation(
  p_published_session_id uuid,
  p_match_score jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid := auth.uid();
  v_parent public.sessions%ROWTYPE;
  v_conv_id uuid;
  v_app public.candidate_applications%ROWTYPE;
BEGIN
  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_candidate() THEN
    RAISE EXCEPTION 'Only candidates can start conversations';
  END IF;

  SELECT * INTO v_parent
  FROM public.sessions
  WHERE id = p_published_session_id
    AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Published role not found';
  END IF;

  -- Re-use an existing application if the candidate already applied to this role.
  SELECT * INTO v_app
  FROM public.candidate_applications
  WHERE candidate_id = v_candidate_id
    AND session_id = p_published_session_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN to_jsonb(v_app);
  END IF;

  INSERT INTO public.sessions (
    user_id,
    status,
    config_source,
    company_profile,
    agent_persona,
    agent_strategy,
    parent_session_id
  ) VALUES (
    v_parent.user_id,
    'simulating',
    v_parent.config_source,
    v_parent.company_profile,
    v_parent.agent_persona,
    v_parent.agent_strategy,
    p_published_session_id
  )
  RETURNING id INTO v_conv_id;

  INSERT INTO public.candidate_applications (
    candidate_id,
    session_id,
    conversation_session_id,
    status,
    match_score
  ) VALUES (
    v_candidate_id,
    p_published_session_id,
    v_conv_id,
    'agent_engaged',
    p_match_score
  )
  RETURNING * INTO v_app;

  UPDATE public.sessions
  SET
    application_count = COALESCE(application_count, 0) + 1,
    updated_at = now()
  WHERE id = p_published_session_id;

  RETURN to_jsonb(v_app);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_candidate_conversation(uuid, jsonb) TO authenticated;

-- Let candidates read conversation sessions linked to their applications (idempotent fix).
DROP POLICY IF EXISTS "candidates_conversation_sessions" ON public.sessions;
CREATE POLICY "candidates_conversation_sessions" ON public.sessions
  FOR SELECT USING (
    public.is_candidate()
    AND EXISTS (
      SELECT 1
      FROM public.candidate_applications ca
      WHERE ca.candidate_id = auth.uid()
        AND ca.conversation_session_id = sessions.id
    )
  );

-- Split employer ALL policy so candidate INSERT policy is not competing on the same command.
DROP POLICY IF EXISTS "employers_own_sessions" ON public.sessions;
CREATE POLICY "employers_own_sessions" ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id AND NOT public.is_admin());

CREATE POLICY "employers_insert_sessions" ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT public.is_admin());

CREATE POLICY "employers_update_sessions" ON public.sessions
  FOR UPDATE
  USING (auth.uid() = user_id AND NOT public.is_admin())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_admin());

CREATE POLICY "employers_delete_sessions" ON public.sessions
  FOR DELETE
  USING (auth.uid() = user_id AND NOT public.is_admin());
