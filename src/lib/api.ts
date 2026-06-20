import { supabase } from './supabase';
import { sanitizeObject } from './sanitize';
import type {
  ApplicationStatus,
  CandidateApplication,
  CandidateSummary,
  CompanyProfile,
  ConfigureResponse,
  Message,
  Profile,
  Session,
  SimulateResponse,
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

export async function simulateReply(
  sessionId: string,
  candidateMessage: string,
): Promise<SimulateResponse> {
  return invokeFunction<SimulateResponse>('simulate', {
    session_id: sessionId,
    action: 'reply',
    candidate_message: candidateMessage,
  });
}

export async function simulateReset(
  sessionId: string,
): Promise<SimulateResponse> {
  return invokeFunction<SimulateResponse>('simulate', {
    session_id: sessionId,
    action: 'reset',
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
  const apps = (data ?? []) as CandidateApplication[];
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
  return (data ?? []) as (CandidateApplication & { session?: Session })[];
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

  const { data: convSession, error: convErr } = await supabase
    .from('sessions')
    .insert({
      user_id: published.user_id,
      status: 'simulating',
      config_source: published.config_source,
      company_profile: published.company_profile,
      agent_persona: published.agent_persona,
      agent_strategy: published.agent_strategy,
      parent_session_id: publishedSessionId,
    })
    .select()
    .single();

  if (convErr) throw new Error(convErr.message);

  const { data: application, error: appErr } = await supabase
    .from('candidate_applications')
    .insert({
      candidate_id: candidateId,
      session_id: publishedSessionId,
      conversation_session_id: convSession.id,
      status: 'agent_engaged',
    })
    .select()
    .single();

  if (appErr) throw new Error(appErr.message);

  await simulateReset(convSession.id);

  await supabase
    .from('sessions')
    .update({
      application_count: (published.application_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', publishedSessionId);

  return application as CandidateApplication;
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
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
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
  const apps = (data ?? []) as CandidateApplication[];
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
