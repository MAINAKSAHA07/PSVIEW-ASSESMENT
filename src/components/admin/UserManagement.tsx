import { useState } from 'react';
import { adminUpdateApplicationStatus, adminUpdateUserRole } from '../../lib/api';
import type { ApplicationStatus, Profile, UserRole } from '../../lib/types';

interface UserManagementProps {
  profiles: Profile[];
  onRefresh: () => void;
}

const ROLES: UserRole[] = ['employer', 'candidate', 'admin'];

export function UserManagement({ profiles, onRefresh }: UserManagementProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (profile: Profile, role: UserRole) => {
    setBusyId(profile.id);
    setError(null);
    try {
      await adminUpdateUserRole(profile.id, role);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="mb-3 text-sm font-medium text-fg-primary">User management</h3>
      {error && <p className="mb-3 text-xs text-err">{error}</p>}
      {profiles.length === 0 ? (
        <p className="text-sm text-fg-secondary">No users found yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-fg-secondary">
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-line/60">
                  <td className="py-3 pr-4 text-fg-primary">
                    {profile.full_name ?? 'Unnamed'}
                  </td>
                  <td className="py-3 pr-4 text-fg-secondary">
                    {profile.email ?? '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        profile.role === 'admin'
                          ? 'bg-coral/10 text-coral'
                          : profile.role === 'candidate'
                            ? 'bg-teal/10 text-teal'
                            : 'bg-app-raised text-fg-secondary'
                      }`}
                    >
                      {profile.role ?? 'unset'}
                    </span>
                  </td>
                  <td className="py-3">
                    <select
                      value={profile.role ?? ''}
                      disabled={busyId === profile.id}
                      onChange={(e) =>
                        void handleRoleChange(
                          profile,
                          e.target.value as UserRole,
                        )
                      }
                      className="rounded-md border border-line bg-app px-2 py-1 text-xs text-fg-primary disabled:opacity-50"
                    >
                      <option value="" disabled>
                        Set role
                      </option>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ApplicationManagementProps {
  applications: Array<{
    id: string;
    status: ApplicationStatus;
    candidate?: { full_name?: string | null; email?: string | null };
    session?: { company_profile?: { company_name?: string; role?: string } };
  }>;
  onRefresh: () => void;
}

const STATUSES: ApplicationStatus[] = [
  'applied',
  'agent_engaged',
  'in_conversation',
  'interview_scheduled',
  'declined',
  'withdrawn',
];

export function ApplicationManagement({
  applications,
  onRefresh,
}: ApplicationManagementProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setBusyId(id);
    setError(null);
    try {
      await adminUpdateApplicationStatus(id, status);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-app-card p-4">
      <h3 className="mb-3 text-sm font-medium text-fg-primary">
        Application management
      </h3>
      {error && <p className="mb-3 text-xs text-err">{error}</p>}
      {applications.length === 0 ? (
        <p className="text-sm text-fg-secondary">No applications yet.</p>
      ) : (
        <ul className="space-y-3">
          {applications.map((app) => (
            <li
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 last:border-0"
            >
              <div>
                <p className="text-sm text-fg-primary">
                  {app.candidate?.full_name ?? 'Candidate'} →{' '}
                  {app.session?.company_profile?.role ?? 'Role'} at{' '}
                  {app.session?.company_profile?.company_name ?? 'Company'}
                </p>
                <p className="text-xs text-fg-tertiary">
                  {app.candidate?.email ?? ''}
                </p>
              </div>
              <select
                value={app.status}
                disabled={busyId === app.id}
                onChange={(e) =>
                  void handleStatusChange(
                    app.id,
                    e.target.value as ApplicationStatus,
                  )
                }
                className="rounded-md border border-line bg-app px-2 py-1 text-xs text-fg-primary disabled:opacity-50"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
