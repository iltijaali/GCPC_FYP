import { NavLink, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';

import NotificationDropdown from './components/NotificationDropdown';
import { useAuth } from './context/useAuth';

const linkClass = ({ isActive }) =>
  `pb-0.5 border-b-2 transition duration-200 hover:text-yellow-300 ${
    isActive ? 'border-yellow-300 text-yellow-300' : 'border-transparent'
  }`;

const Header = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="bg-gradient-to-r from-blue-900 to-indigo-800 shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center flex-wrap">
        <div className="text-white text-2xl font-bold tracking-wide">
          Govt Commodities
          <span className="text-yellow-300 ml-1">Price Calculator</span>
        </div>

        <nav
          className="flex items-center flex-wrap gap-4 mt-3 md:mt-0 text-sm md:text-base text-white"
          aria-label="Main"
        >
          <NavLink to="/" end className={linkClass}>Home</NavLink>

          {!loading && !user && <NavLink to="/auth" className={linkClass}>Login/Signup</NavLink>}

          {user && (
            <>
              <NavLink to="/products" className={linkClass}>Products</NavLink>
              <NavLink to="/cart" className={linkClass}>Cart</NavLink>
              <NavLink to="/complaints" className={linkClass}>Complaints</NavLink>
              <NavLink to="/history" className={linkClass}>History</NavLink>

              <div className="flex items-center gap-2 text-yellow-300 font-medium">
                <FaUserCircle className="text-xl" aria-hidden="true" />
                Hi, {user.username}
              </div>

              <NotificationDropdown />

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow transition"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
