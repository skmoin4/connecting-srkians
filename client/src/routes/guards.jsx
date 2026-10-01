import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from '../components/ui/Display.jsx';

/**
 * Client-side guards are a UX convenience only — every protected API endpoint re-checks
 * authentication and roles on the server.
 */
export function ProtectedRoute({ roles }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState label="Checking your session…" className="min-h-[50vh]" />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState className="min-h-[50vh]" />;
  if (status === 'authenticated') return <Navigate to={location.state?.from || '/dashboard'} replace />;
  return <Outlet />;
}
