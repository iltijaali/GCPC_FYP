import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiExternalLink, FiFlag, FiGrid, FiLogOut, FiMenu, FiMoon, FiShield, FiShoppingBag, FiSun, FiTag, FiUsers, FiX } from 'react-icons/fi';
import { useAuth } from '../context/useAuth';
import { initials } from './format';
import { useTheme } from './useTheme';
import './admin.css';

const NAV = [
  { to: '/admin', label: 'Overview', Icon: FiGrid, end: true },
  { to: '/admin/complaints', label: 'Complaints', Icon: FiFlag },
  { to: '/admin/products', label: 'Products', Icon: FiTag },
  { to: '/admin/orders', label: 'Orders', Icon: FiShoppingBag },
  { to: '/admin/users', label: 'Users', Icon: FiUsers },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { choice, effective, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="admin-root" data-theme={choice ?? undefined}>
      <div className="lg:flex">
        {menuOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

        <aside
          className={`adm-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          aria-label="Admin navigation"
        >
          <div className="mb-6 flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(138,164,255,0.18)', color: '#b6c6ff' }}>
                <FiShield aria-hidden="true" size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-[15px] font-semibold text-white">GCPC Admin</p>
                <p className="text-[11.5px]" style={{ color: 'var(--sidebar-muted)' }}>Price Calculator</p>
              </div>
            </div>
            <button type="button" className="adm-btn adm-btn-ghost adm-icon-btn lg:hidden" style={{ color: '#fff' }} onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <FiX aria-hidden="true" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.Icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className="adm-nav-link" onClick={() => setMenuOpen(false)}>
                  <Icon aria-hidden="true" size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <Link to="/" className="adm-nav-link mt-2" style={{ color: 'var(--sidebar-muted)' }}>
            <FiExternalLink aria-hidden="true" size={18} />
            Back to the site
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="adm-topbar sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-2">
              <button type="button" className="adm-btn adm-icon-btn lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <FiMenu aria-hidden="true" />
              </button>
              <span className="muted hidden text-[13px] sm:inline">Admin dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="adm-btn adm-icon-btn"
                onClick={toggle}
                aria-label={effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={effective === 'dark' ? 'Light theme' : 'Dark theme'}
              >
                {effective === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
              </button>
              <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-ink)' }} aria-hidden="true">
                  {initials(user.username)}
                </span>
                <span className="text-[13px] font-medium">{user.username}</span>
              </div>
              <button
                type="button"
                className="adm-btn"
                onClick={() => {
                  logout();
                  navigate('/auth');
                }}
              >
                <FiLogOut aria-hidden="true" /> <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
