import { supabase } from './supabase';
import { sanitizeObject } from './sanitize';
import { computeRoleMatch, parseRoleMatch, buildSessionApplicantPool } from './matching';
import type { ApplicantPoolEntry } from './matching';
import type {
  ApplicationStatus,
  CandidateApplication,
  CandidateSummary,
  CompanyProfile,
  ConfigureResponse,
  Message,
  ParsedResume,
  Profile,
  RoleMatch,
  Session,
  SimulateResponse,
  SimulateAnalyzeResponse,
  SummarizeResponse,
  SynthesizeResponse,
  UserRole,
} from './types';

async function invokeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }

  if (error) {
    throw new Error(error.message);
  }

  return sanitizeObject(data as T);
}

export async function configureChat(
  sessionId: string,
  message: string,
): Promise<ConfigureResponse> {
  return invokeFunction<ConfigureResponse>('configure', {
    session_id: sessionId,
    action: 'chat',
    message,
  });
}

export async function configureUpload(
  sessionId: string,
  fileText: string,
): Promise<ConfigureResponse> {
  return invokeFunction<ConfigureResponse>('configure', {
    session_id: sessionId,
    action: 'upload',
    file_text: fileText,
  });
}

export async function configureQuickSetup(
  sessionId: string,
  formData: CompanyProfile,
): Promise<ConfigureResponse> {
  return invokeFunction<ConfigureResponse>('configure', {
    session_id: sessionId,
    action: 'quicksetup',
    form_data: formData,
  });
}

export async function synthesizeFull(
  sessionId: string,
): Promise<SynthesizeResponse> {
  return invokeFunction<SynthesizeResponse>('synthesize', {
    session_id: sessionId,
    action: 'full',
  });
}

export async function simulateAnalyze(
  sessionId: string,
  candidateMessage: string,
  options?: { hideReasoning?: boolean },
): Promise<SimulateAnalyzeResponse> {
  return invokeFunction<SimulateAnalyzeResponse>('simulate', {
    session_id: sessionId,
    action: 'analyze',
    candidate_message: candidateMessage,
    hide_reasoning: options?.hideReasoning,
  });
}

export async function simulateReply(
  sessionId: string,
  candidateMessage: string,
  options?: {
    hideReasoning?: boolean;
    preAnalysis?: Record<string, unknown>;
    preStrategyCheck?: Record<string, unknown>;
  },
): Promise<SimulateResponse> {
  return invokeFunction<SimulateResponse>('simulate', {
    session_id: sessionId,
    action: 'reply',
    candidate_message: candidateMessage,
    hide_reasoning: options?.hideReasoning,
    pre_analysis: options?.preAnalysis,
    pre_strategy_check: options?.preStrategyCheck,
  });
}

export async function simulateReset(
  sessionId: string,
  options?: { hideReasoning?: boolean },
): Promise<SimulateResponse> {
  return invokeFunction<SimulateResponse>('simulate', {
    session_id: sessionId,
    action: 'reset',
    hide_reasoning: options?.hideReasoning,
  });
}

export async function simulateSummarize(
  sessionId: string,
): Promise<SummarizeResponse> {
  return invokeFunction<SummarizeResponse>('simulate', {
    session_id: sessionId,
    action: 'summarize',
  });
}

export async function parseResume(fileText: string): Promise<{
  profile: Profile;
  parsed: ParsedResume;
}> {
  return invokeFunction<{ profile: Profile; parsed: ParsedResume }>(
    'parse-resume',
    { file_text: fileText },
  );
}

export async function updateApplicationMatchScore(
  applicationId: string,
  matchScore: RoleMatch,
): Promise<void> {
  const { error } = await supabase
    .from('candidate_applications')
    .update({ match_score: matchScore })
    .eq('id', applicationId);

  if (error) throw new Error(error.message);
}

function mapApplication(row: Record<string, unknown>): CandidateApplication {
  return {
    ...(row as unknown as CandidateApplication),
    match_score: parseRoleMatch(row.match_score),
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...data,
    skills: (data.skills as string[]) ?? [],
    open_to_roles: (data.open_to_roles as string[]) ?? [],
  } as Profile;
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    skills: (data.skills as string[]) ?? [],
    open_to_roles: (data.open_to_roles as string[]) ?? [],
  } as Profile;
}

export async function setUserRole(userId: string, role: UserRole): Promise<Profile> {
  return upsertProfile(userId, { role });
}

export async function publishSession(sessionId: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Session;
}

export async function unpublishSession(sessionId: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({
      is_published: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Session;
}

export async function fetchPublishedSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

function mapProfileRow(row: Record<string, unknown>): Profile {
  return {
    ...(row as unknown as Profile),
    skills: (row.skills as string[]) ?? [],
    open_to_roles: (row.open_to_roles as string[]) ?? [],
  };
}

export async function fetchSessionApplicantPool(
  session: Session,
): Promise<ApplicantPoolEntry[]> {
  const { data, error } = await supabase.rpc('get_session_applicant_pool', {
    p_session_id: session.id,
  });

  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as {
    applications?: Record<string, unknown>[];
    candidates?: Record<string, unknown>[];
  };

  const applications = (payload.applications ?? []).map((row) =>
    mapApplication(row),
  );
  const candidates = (payload.candidates ?? []).map((row) => mapProfileRow(row));

  return buildSessionApplicantPool(session, applications, candidates);
}

export async function fetchEmployerApplications(
  userId: string,
): Promise<(CandidateApplication & { candidate?: Profile; session?: Session })[]> {
  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId);

  if (sessErr) throw new Error(sessErr.message);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('candidate_applications')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const apps = (data ?? []).map((row) =>
    mapApplication(row as Record<string, unknown>),
  );
  if (apps.length === 0) return [];

  const candidateIds = [...new Set(apps.map((a) => a.candidate_id))];
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', candidateIds);

  if (profErr) throw new Error(profErr.message);

  return apps.map((app) => ({
    ...app,
    candidate: (profiles ?? []).find((p) => p.id === app.candidate_id) as
      | Profile
      | undefined,
  }));
}

export async function fetchCandidateApplications(
  candidateId: string,
): Promise<(CandidateApplication & { session?: Session })[]> {
  const { data, error } = await supabase
    .from('candidate_applications')
    .select('*, session:sessions!candidate_applications_session_id_fkey(*)')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapApplication(row as Record<string, unknown>),
  );
}

export async function startCandidateConversation(
  publishedSessionId: string,
  candidateId: string,
): Promise<CandidateApplication> {
  const { data: published, error: pubErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', publishedSessionId)
    .eq('is_published', true)
    .single();

  if (pubErr || !published) throw new Error('Published role not found');

  const { data: candidateProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (profileErr) throw new Error(profileErr.message);

  const profile = {
    ...candidateProfile,
    skills: (candidateProfile.skills as string[]) ?? [],
    open_to_roles: (candidateProfile.open_to_roles as string[]) ?? [],
  } as Profile;

  const matchScore = computeRoleMatch(profile, published as Session);

  const { data: application, error: rpcErr } = await supabase.rpc(
    'start_candidate_conversation',
    {
      p_published_session_id: publishedSessionId,
      p_match_score: matchScore,
    },
  );

  if (rpcErr) throw new Error(rpcErr.message);
  if (!application || typeof application !== 'object') {
    throw new Error('Failed to start conversation');
  }

  const appRow = application as Record<string, unknown>;
  const convSessionId = appRow.conversation_session_id as string | undefined;

  if (convSessionId) {
    const { count, error: countErr } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', convSessionId)
      .eq('phase', 'simulation');

    const hasMessages = !countErr && (count ?? 0) > 0;

    if (!hasMessages) {
      try {
        await simulateReset(convSessionId, { hideReasoning: true });
      } catch {
        // Application was created; conversation view can retry opening message.
      }
    }
  }

  return mapApplication(appRow);
}

export async function fetchAdminStats() {
  const [sessions, applications, published, candidatesResult] = await Promise.all([
    supabase.from('sessions').select('id', { count: 'exact', head: true }),
    supabase
      .from('candidate_applications')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true),
    supabase.from('profiles').select('id').eq('role', 'candidate'),
  ]);

  const { data: summaries } = await supabase
    .from('candidate_applications')
    .select('candidate_summary')
    .not('candidate_summary', 'eq', '{}');

  let avgInterest = 0;
  const scores = (summaries ?? [])
    .map((s) => (s.candidate_summary as CandidateSummary)?.engagement_score)
    .filter((n): n is number => typeof n === 'number');
  if (scores.length > 0) {
    avgInterest = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  return {
    companies: new Set(
      (await supabase.from('sessions').select('user_id')).data?.map(
        (s) => s.user_id,
      ) ?? [],
    ).size,
    activeAgents: published.count ?? 0,
    candidates: candidatesResult.data?.length ?? 0,
    applications: applications.count ?? 0,
    conversations: sessions.count ?? 0,
    avgInterest: Math.round(avgInterest * 100),
  };
}

export async function fetchRecentActivity() {
  const [recentSessions, recentApps] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, created_at, updated_at, company_profile, is_published, agent_persona')
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('candidate_applications')
      .select('id, created_at, status, candidate_id')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const candidateIds = [
    ...new Set((recentApps.data ?? []).map((a) => a.candidate_id)),
  ];
  const { data: profiles } = candidateIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, current_role')
        .in('id', candidateIds)
    : { data: [] };

  const applications = (recentApps.data ?? []).map((app) => ({
    ...app,
    candidate: profiles?.find((p) => p.id === app.candidate_id),
  }));

  return {
    sessions: recentSessions.data ?? [],
    applications,
  };
}

export async function createSession(userId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, status: 'configuring' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchSession(sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchUserSessions(userId: string) {
  return fetchEmployerAgentSessions(userId);
}

export async function fetchEmployerAgentSessions(
  userId: string,
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .is('parent_session_id', null)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

export async function fetchMessages(sessionId: string, phase?: string) {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (phase) {
    query = query.eq('phase', phase);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function insertMessage(
  message: Pick<Message, 'session_id' | 'phase' | 'role' | 'content'>,
) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Message;
}

export async function updateSessionStatus(
  sessionId: string,
  status: string,
) {
  const { error } = await supabase
    .from('sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

export async function resetSessionForReconfigure(sessionId: string) {
  const { error: msgError } = await supabase
    .from('messages')
    .delete()
    .eq('session_id', sessionId);

  if (msgError) throw new Error(msgError.message);

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'configuring',
      agent_persona: {},
      agent_strategy: {},
      company_profile: {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

export async function deleteSimulationMessages(sessionId: string) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('session_id', sessionId)
    .eq('phase', 'simulation');

  if (error) throw new Error(error.message);
}

export async function deleteEmployerSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);

  if (error) throw new Error(error.message);
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    skills: (row.skills as string[]) ?? [],
    open_to_roles: (row.open_to_roles as string[]) ?? [],
  })) as Profile[];
}

export async function adminUpdateUserRole(
  userId: string,
  role: UserRole,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    skills: (data.skills as string[]) ?? [],
    open_to_roles: (data.open_to_roles as string[]) ?? [],
  } as Profile;
}

export async function fetchAllApplications(): Promise<
  (CandidateApplication & {
    candidate?: Profile;
    session?: Session;
  })[]
> {
  const { data, error } = await supabase
    .from('candidate_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const apps = (data ?? []).map((row) =>
    mapApplication(row as Record<string, unknown>),
  );
  if (apps.length === 0) return [];

  const candidateIds = [...new Set(apps.map((a) => a.candidate_id))];
  const sessionIds = [...new Set(apps.map((a) => a.session_id))];

  const [{ data: profiles }, { data: sessions }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', candidateIds),
    supabase.from('sessions').select('*').in('id', sessionIds),
  ]);

  return apps.map((app) => ({
    ...app,
    candidate: (profiles ?? []).find((p) => p.id === app.candidate_id) as
      | Profile
      | undefined,
    session: (sessions ?? []).find((s) => s.id === app.session_id) as
      | Session
      | undefined,
  }));
}

export async function adminUpdateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase
    .from('candidate_applications')
    .update({ status })
    .eq('id', applicationId);

  if (error) throw new Error(error.message);
}

export async function adminUpdateUserProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    skills: (data.skills as string[]) ?? [],
    open_to_roles: (data.open_to_roles as string[]) ?? [],
  } as Profile;
}

export async function adminCreateEmployer(input: {
  email: string;
  full_name: string;
  company_name: string;
}): Promise<Profile> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'create_employer', ...input },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error as string);

  const profile = data.profile as Profile;
  return {
    ...profile,
    skills: (profile.skills as string[]) ?? [],
    open_to_roles: (profile.open_to_roles as string[]) ?? [],
  };
}

export async function adminCreateCandidate(input: {
  email: string;
  full_name: string;
  current_role?: string;
  location?: string;
  skills?: string[] | string;
}): Promise<Profile> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'create_candidate', ...input },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error as string);

  const profile = data.profile as Profile;
  return {
    ...profile,
    skills: (profile.skills as string[]) ?? [],
    open_to_roles: (profile.open_to_roles as string[]) ?? [],
  };
}
