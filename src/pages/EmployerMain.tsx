import { Routes, Route } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { MainLoader } from '../components/layout/MainLoader';
import { EmployerDashboard } from '../components/employer/EmployerDashboard';
import { Main } from './Main';

export function EmployerMain() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app">
      <TopBar />
      <MainLoader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Routes>
          <Route index element={<Main />} />
          <Route path="dashboard" element={<EmployerDashboard />} />
        </Routes>
      </div>
    </div>
  );
}
