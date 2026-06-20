import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchAdminStats,
  fetchAllApplications,
  fetchAllProfiles,
  fetchRecentActivity,
  fetchPublishedSessions,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import type { CandidateApplication, Profile, Session } from '../lib/types';

interface AdminDataContextValue {
  stats: Awaited<ReturnType<typeof fetchAdminStats>> | null;
  activity: Awaited<ReturnType<typeof fetchRecentActivity>> | null;
  publishedSessions: Session[];
  allSessions: Session[];
  agentSessions: Session[];
  profiles: Profile[];
  applications: (CandidateApplication & {
    candidate?: Profile;
    session?: Session;
  })[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AdminDataContextValue['stats']>(null);
  const [activity, setActivity] = useState<AdminDataContextValue['activity']>(null);
  const [publishedSessions, setPublishedSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [applications, setApplications] = useState<
    AdminDataContextValue['applications']
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a, published, allRes, allProfiles, allApps] = await Promise.all([
        fetchAdminStats(),
        fetchRecentActivity(),
        fetchPublishedSessions(),
        supabase
          .from('sessions')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(50),
        fetchAllProfiles(),
        fetchAllApplications(),
      ]);

      setStats(s);
      setActivity(a);
      setPublishedSessions(published);
      setAllSessions((allRes.data ?? []) as Session[]);
      setProfiles(allProfiles);
      setApplications(allApps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const agentSessions = publishedSessions.length ? publishedSessions : allSessions;

  const value = useMemo(
    () => ({
      stats,
      activity,
      publishedSessions,
      allSessions,
      agentSessions,
      profiles,
      applications,
      loading,
      error,
      refresh,
    }),
    [
      stats,
      activity,
      publishedSessions,
      allSessions,
      agentSessions,
      profiles,
      applications,
      loading,
      error,
      refresh,
    ],
  );

  return (
    <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error('useAdminData must be used within AdminDataProvider');
  }
  return ctx;
}
