import { Route, Routes } from 'react-router-dom';
import { AdminDataProvider } from '../context/AdminDataContext';
import { SimpleTopBar } from '../components/layout/SimpleTopBar';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminSectionPage } from './admin/AdminSectionPage';

export function AdminMain() {
  return (
    <AdminDataProvider>
      <div className="flex min-h-screen flex-col bg-app">
        <SimpleTopBar />
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path=":section" element={<AdminSectionPage />} />
        </Routes>
      </div>
    </AdminDataProvider>
  );
}
