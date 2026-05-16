import { Navigate } from 'react-router-dom';
import { isAuthenticated, getRole } from '../utils/auth';

export default function PrivateRoute({ children, requiredRole }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && getRole() !== requiredRole) {
    return <Navigate to="/map" replace />;
  }
  return children;
}