import { useAdminData } from '../../context/AdminDataContext';
import { ActivityFeed, type ActivityFeedProps } from './ActivityFeed';
import { PlatformStats } from './PlatformStats';
import { UserManagement } from './UserManagement';

export function AdminDashboard() {
  const { stats, activity, profiles, loading, error, refresh } = useAdminData();

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

      {activity && (
        <div className="mt-8">
          <ActivityFeed
            sessions={activity.sessions as ActivityFeedProps['sessions']}
            applications={activity.applications as ActivityFeedProps['applications']}
          />
        </div>
      )}

      <div className="mt-8">
        <UserManagement profiles={profiles} onRefresh={() => void refresh()} />
      </div>
    </div>
  );
}
