import { Navigate, useParams } from 'react-router-dom';
import { useAdminData } from '../../context/AdminDataContext';
import { AdminSectionLayout } from '../../components/admin/AdminSectionLayout';
import { AgentManagement } from '../../components/admin/AgentManagement';
import { ApplicationManagement } from '../../components/admin/UserManagement';
import { CandidateManagement } from '../../components/admin/CandidateManagement';
import { CompanyManagement } from '../../components/admin/CompanyManagement';
import { ConversationList } from '../../components/admin/ConversationList';
import { InterestOverview } from '../../components/admin/InterestOverview';
import {
  ADMIN_SECTION_META,
  isAdminStatSection,
  type AdminStatSection,
} from '../../components/admin/PlatformStats';

function AdminLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
    </div>
  );
}

export function AdminSectionPage() {
  const { section } = useParams<{ section: string }>();
  const {
    loading,
    error,
    profiles,
    allSessions,
    agentSessions,
    applications,
    stats,
    refresh,
  } = useAdminData();

  if (!section || !isAdminStatSection(section)) {
    return <Navigate to="/app" replace />;
  }

  const meta = ADMIN_SECTION_META[section as AdminStatSection];

  if (loading) return <AdminLoading />;

  return (
    <AdminSectionLayout title={meta.title} description={meta.description}>
      {error && <p className="mb-4 text-sm text-err">{error}</p>}
      {section === 'companies' && (
        <CompanyManagement
          profiles={profiles}
          sessions={allSessions}
          onRefresh={() => void refresh()}
        />
      )}
      {section === 'agents' && <AgentManagement sessions={agentSessions} />}
      {section === 'candidates' && (
        <CandidateManagement
          profiles={profiles}
          onRefresh={() => void refresh()}
        />
      )}
      {section === 'applications' && (
        <ApplicationManagement
          applications={applications}
          onRefresh={() => void refresh()}
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
    </AdminSectionLayout>
  );
}
