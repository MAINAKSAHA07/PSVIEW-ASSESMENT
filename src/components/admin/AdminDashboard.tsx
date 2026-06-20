import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminStats,
  fetchAllApplications,
  fetchAllProfiles,
  fetchRecentActivity,
  fetchPublishedSessions,
} from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { CandidateApplication, Profile, Session } from '../../lib/types';
import { ActivityFeed, type ActivityFeedProps } from './ActivityFeed';
import { PlatformStats } from './PlatformStats';
import { ApplicationManagement, UserManagement } from './UserManagement';

function CompanyList({ sessions }: { sessions: Session[] }) {
  const byCompany = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const name = s.company_profile?.company_name ?? 'Unknown';
    acc[name] = acc[name] ?? [];
    acc[name].push(s);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="mb-3 text-sm font-medium text-fg-primary">Companies</h3>
      <ul className="space-y-2">
        {Object.entries(byCompany).map(([name, list]) => (
          <li key={name} className="flex justify-between text-sm text-fg-secondary">
            <span>{name}</span>
            <span>{list.length} role{list.length === 1 ? '' : 's'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgentList({ sessions }: { sessions: Session[] }) {
  const agents = sessions.filter((s) => s.agent_persona?.name);

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="mb-3 text-sm font-medium text-fg-primary">Agents</h3>
      <ul className="space-y-2">
        {agents.map((s) => (
          <li key={s.id} className="flex justify-between text-sm text-fg-secondary">
            <span>
              {s.agent_persona.name} ({s.company_profile?.company_name ?? 'Company'})
            </span>
            <span>{s.is_published ? 'Active' : 'Draft'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchAdminStats>> | null>(
    null,
  );
  const [activity, setActivity] = useState<
    Awaited<ReturnType<typeof fetchRecentActivity>> | null
  >(null);
  const [publishedSessions, setPublishedSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [applications, setApplications] = useState<
    (CandidateApplication & { candidate?: Profile; session?: Session })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([
      fetchAdminStats(),
      fetchRecentActivity(),
      fetchPublishedSessions(),
      supabase.from('sessions').select('*').order('updated_at', { ascending: false }).limit(20),
      fetchAllProfiles(),
      fetchAllApplications(),
    ])
      .then(([s, a, published, allRes, allProfiles, allApps]) => {
        setStats(s);
        setActivity(a);
        setPublishedSessions(published);
        setAllSessions((allRes.data ?? []) as Session[]);
        setProfiles(allProfiles);
        setApplications(allApps);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load admin data'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl flex-1 overflow-y-auto p-6">
      <h1 className="mb-6 font-serif text-2xl text-fg-primary">AgentForge Admin</h1>
      {error && <p className="mb-4 text-sm text-err">{error}</p>}
      {stats && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase text-fg-secondary">
            Platform stats
          </h2>
          <PlatformStats stats={stats} />
        </>
      )}

      <div className="mt-8 space-y-4">
        <UserManagement profiles={profiles} onRefresh={() => void loadData()} />
        <ApplicationManagement
          applications={applications}
          onRefresh={() => void loadData()}
        />
      </div>

      {activity && (
        <div className="mt-8">
          <ActivityFeed
            sessions={activity.sessions as ActivityFeedProps['sessions']}
            applications={activity.applications as ActivityFeedProps['applications']}
          />
        </div>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <CompanyList sessions={allSessions} />
        <AgentList sessions={publishedSessions.length ? publishedSessions : allSessions} />
      </div>
    </div>
  );
}
