import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import PrivateRoute          from './components/PrivateRoute';
import LoginPage             from './pages/LoginPage';
import MapPage               from './pages/MapPage';
import HistoryPage           from './pages/HistoryPage';
import DashboardPage         from './pages/DashboardPage';

// Pages admin — à créer (voir ci-dessous)
import AdminDashboardPage    from './pages/admin/AdminDashboardPage';
import AddUserPage    from './pages/admin/AddUserPage';
import UsersPage             from './pages/admin/UsersPage';
import AssociationsPage      from './pages/admin/AssociationsPage';
import LogsPage              from './pages/admin/LogsPage';
import NewAssociationPage from './pages/admin/NewAssociationPage';
import ReportsPage from './pages/admin/ReportsPage';
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Companion */}
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        }/>
        <Route path="/map" element={
          <PrivateRoute><MapPage /></PrivateRoute>
        }/>
        <Route path="/history" element={
          <PrivateRoute><HistoryPage /></PrivateRoute>
        }/>

        {/* Admin — requiredRole="ADMIN" bloque les companions */}
        <Route path="/admin" element={
          <PrivateRoute requiredRole="ADMIN">
            <AdminDashboardPage />
          </PrivateRoute>
        }/>
        <Route path="/admin/users" element={
          <PrivateRoute requiredRole="ADMIN">
            <UsersPage />
          </PrivateRoute>
        }/>
        <Route path="/admin/associations" element={
          <PrivateRoute requiredRole="ADMIN">
            <AssociationsPage />
          </PrivateRoute>
        }/>
        <Route path="/admin/logs" element={
          <PrivateRoute requiredRole="ADMIN">
            <LogsPage />
          </PrivateRoute>
        }/>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/admin/users/add"  element={<AddUserPage />} />
        <Route path="/admin/users/edit" element={<AddUserPage />} />
        <Route path="/admin/associations/new" element={
          <PrivateRoute requiredRole="ADMIN">
            <NewAssociationPage />
          </PrivateRoute>
        }/>
    <Route path="/admin/reports" element={
      <PrivateRoute requiredRole="ADMIN">
        <ReportsPage />
      </PrivateRoute>
    }/>
      </Routes>
    </BrowserRouter>
  );
}