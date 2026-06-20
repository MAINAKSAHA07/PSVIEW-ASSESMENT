import { Route, Routes } from 'react-router-dom';
import { AdminDataProvider } from '../context/AdminDataContext';
import { SimpleTopBar } from '../components/layout/SimpleTopBar';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminSectionPage } from './admin/AdminSectionPage';

export function AdminMain() {
  return (
    <AdminDataProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-app">
        <SimpleTopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path=":section" element={<AdminSectionPage />} />
          </Routes>
        </div>
      </div>
    </AdminDataProvider>
  );
}
