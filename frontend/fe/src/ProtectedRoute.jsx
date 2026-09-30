import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import Loading from './components/Loading';

// Shows the page only for a logged-in user; otherwise sends them to /auth and back afterwards.
const ProtectedRoute = ({ element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  return user ? element : <Navigate to="/auth" replace state={{ from: location.pathname }} />;
};

export default ProtectedRoute;
