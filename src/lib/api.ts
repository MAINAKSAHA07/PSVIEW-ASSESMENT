import { supabase } from './supabase';
import { sanitizeObject } from './sanitize';
import type {
  CompanyProfile,
  ConfigureResponse,
  SimulateResponse,
  SynthesizeResponse,
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
