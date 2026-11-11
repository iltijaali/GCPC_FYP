import { Link, Navigate, useLocation } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { useAuth } from '../context/useAuth';
import Loading from '../components/Loading';

// Only administrators get past this. Logged-out visitors are sent to log in; everyone else sees why not.
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (!user.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <FiLock className="mx-auto mb-4 text-4xl text-indigo-900" aria-hidden="true" />
          <h1 className="mb-2 text-2xl font-bold text-indigo-900">Administrators only</h1>
          <p className="mb-6 text-gray-600">
            Your account (<strong>{user.username}</strong>) does not have access to the admin dashboard.
          </p>
          <Link to="/" className="inline-block rounded-lg bg-indigo-900 px-5 py-2.5 font-semibold text-white hover:bg-indigo-800">
            Back to the site
          </Link>
        </div>
      </div>
    );
  }
  return children;
}
