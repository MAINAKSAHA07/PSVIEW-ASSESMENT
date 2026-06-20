import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchProfile, upsertProfile, setUserRole } from '../lib/api';
import type { Profile, UserRole } from '../lib/types';
import { useAuthContext } from './AuthContext';

interface ProfileContextValue {
  profile: Profile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  needsRoleSelection: boolean;
  needsCandidateOnboarding: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      let data = await fetchProfile(user.id);
      if (!data) {
        data = await upsertProfile(user.id, {
          full_name:
            (user.user_metadata?.full_name as string) ??
            (user.user_metadata?.name as string) ??
            null,
          email: user.email ?? null,
          avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        });
      }
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const selectRole = useCallback(
    async (role: UserRole) => {
      if (!user) return;
      const updated = await setUserRole(user.id, role);
      setProfile(updated);
    },
    [user],
  );

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) return;
      const updated = await upsertProfile(user.id, updates);
      setProfile(updated);
    },
    [user],
  );

  const needsRoleSelection = Boolean(user && profile && !profile.role);
  const needsCandidateOnboarding = Boolean(
    user &&
      profile?.role === 'candidate' &&
      !profile.current_role &&
      profile.skills.length === 0,
  );

  const value = useMemo(
    () => ({
      profile,
      profileLoading,
      refreshProfile,
      selectRole,
      updateProfile,
      needsRoleSelection,
      needsCandidateOnboarding,
    }),
    [
      profile,
      profileLoading,
      refreshProfile,
      selectRole,
      updateProfile,
      needsRoleSelection,
      needsCandidateOnboarding,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfileContext must be used within ProfileProvider');
  }
  return ctx;
}
