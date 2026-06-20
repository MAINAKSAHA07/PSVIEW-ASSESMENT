import { SimpleTopBar } from '../components/layout/SimpleTopBar';
import { AdminDashboard } from '../components/admin/AdminDashboard';

export function AdminMain() {
  return (
    <div className="flex min-h-screen flex-col bg-app">
      <SimpleTopBar />
      <AdminDashboard />
    </div>
  );
}
