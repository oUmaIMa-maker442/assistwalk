import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />
        {/* Companion routes */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <DashboardPage />
                    </PrivateRoute>
                  }
                />
        <Route
                  path="/map"
                  element={
                    <PrivateRoute>
                      <MapPage />
                    </PrivateRoute>
                  }
                />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <HistoryPage />
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}