-- Let employers fetch applicant pool for a role: applications + candidate profiles for match scoring.

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
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_applicant_pool(uuid) TO authenticated;
