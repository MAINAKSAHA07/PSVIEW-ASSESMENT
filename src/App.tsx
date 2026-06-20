import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { ProfileProvider, useProfileContext } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { SessionProvider } from './context/SessionContext';
import { RoleSelector } from './components/roles/RoleSelector';
import { Landing } from './pages/Landing';
import { EmployerMain } from './pages/EmployerMain';
import { CandidateMain } from './pages/CandidateMain';
import { AdminMain } from './pages/AdminMain';

function AppShell() {
  const { user, loading: authLoading } = useAuthContext();
  const { profile, profileLoading, needsRoleSelection } = useProfileContext();

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="h-8 w-8 animate-pulse rounded-full bg-teal/30" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (needsRoleSelection) {
    return <RoleSelector />;
  }

  const role = profile?.role ?? 'employer';

  return (
    <SessionProvider>
      <Routes>
        <Route
          path="/app/*"
          element={
            role === 'admin' ? (
              <AdminMain />
            ) : role === 'candidate' ? (
              <CandidateMain />
            ) : (
              <EmployerMain />
            )
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </SessionProvider>
  );
}

function AppRoutes() {
  return (
    <ProfileProvider>
      <AppShell />
    </ProfileProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
