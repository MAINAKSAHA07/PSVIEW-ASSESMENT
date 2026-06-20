import { useCallback, useEffect, useRef, useState } from 'react';
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
import { AgentManagement } from './AgentManagement';
import { CandidateManagement } from './CandidateManagement';
import { CompanyManagement } from './CompanyManagement';
import { ConversationList } from './ConversationList';
import { InterestOverview } from './InterestOverview';
import { PlatformStats, type AdminStatSection } from './PlatformStats';
import { ApplicationManagement, UserManagement } from './UserManagement';

const SECTION_ORDER: AdminStatSection[] = [
  'companies',
  'agents',
  'candidates',
  'applications',
  'conversations',
  'interest',
];

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
  const [activeSection, setActiveSection] = useState<AdminStatSection | null>(
    null,
  );

  const sectionRefs = useRef<Record<AdminStatSection, HTMLDivElement | null>>({
    companies: null,
    agents: null,
    candidates: null,
    applications: null,
    conversations: null,
    interest: null,
  });

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([
      fetchAdminStats(),
      fetchRecentActivity(),
      fetchPublishedSessions(),
      supabase.from('sessions').select('*').order('updated_at', { ascending: false }).limit(50),
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

  const scrollToSection = (section: AdminStatSection) => {
    setActiveSection(section);
    requestAnimationFrame(() => {
      sectionRefs.current[section]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  const agentSessions = publishedSessions.length ? publishedSessions : allSessions;

  return (
    <div className="mx-auto max-w-5xl flex-1 overflow-y-auto p-6">
      <h1 className="mb-6 font-serif text-2xl text-fg-primary">AgentForge Admin</h1>
      {error && <p className="mb-4 text-sm text-err">{error}</p>}

      {stats && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase text-fg-secondary">
            Platform stats
          </h2>
          <PlatformStats
            stats={stats}
            activeSection={activeSection}
            onSelectSection={scrollToSection}
          />
        </>
      )}

      <div className="mt-8 space-y-6">
        {SECTION_ORDER.map((section) => (
          <div
            key={section}
            ref={(el) => {
              sectionRefs.current[section] = el;
            }}
            className={`scroll-mt-6 rounded-xl transition ${
              activeSection === section ? 'ring-2 ring-teal/20' : ''
            }`}
          >
            {section === 'companies' && (
              <CompanyManagement
                profiles={profiles}
                sessions={allSessions}
                onRefresh={() => void loadData()}
              />
            )}
            {section === 'agents' && <AgentManagement sessions={agentSessions} />}
            {section === 'candidates' && (
              <CandidateManagement
                profiles={profiles}
                onRefresh={() => void loadData()}
              />
            )}
            {section === 'applications' && (
              <ApplicationManagement
                applications={applications}
                onRefresh={() => void loadData()}
              />
            )}
            {section === 'conversations' && (
              <ConversationList sessions={allSessions} />
            )}
            {section === 'interest' && stats && (
              <InterestOverview
                applications={applications}
                avgInterest={stats.avgInterest}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <UserManagement profiles={profiles} onRefresh={() => void loadData()} />
      </div>

      {activity && (
        <div className="mt-8">
          <ActivityFeed
            sessions={activity.sessions as ActivityFeedProps['sessions']}
            applications={activity.applications as ActivityFeedProps['applications']}
          />
        </div>
      )}
    </div>
  );
}
