import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
