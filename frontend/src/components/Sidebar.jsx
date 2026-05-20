import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import {
  LayoutDashboard, History, Star, User, Shield,
  LogOut, ChevronLeft, ChevronRight, Zap, Menu, X, Video
} from 'lucide-react';

const navLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/video', icon: Video, label: 'Video Studio' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/favorites', icon: Star, label: 'Favorites' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border-dark">
        <div className="flex-shrink-0 w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-text-primary text-sm leading-tight">AI Script</p>
            <p className="text-xs text-text-muted leading-tight">Generator</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? 'Admin' : undefined}
          >
            <Shield size={18} className="flex-shrink-0 text-accent-amber" />
            {!collapsed && <span className="truncate text-accent-amber">Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* User info & actions */}
      <div className="p-3 border-t border-border-dark space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2.5 rounded-xl bg-white/5 mb-2">
            <p className="text-sm font-semibold text-text-primary truncate">{user.full_name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
            {user.role === 'admin' && (
              <span className="badge bg-accent-amber/10 text-accent-amber border border-accent-amber/20 mt-1">
                Admin
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10
            ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-card-dark border border-border-dark
          rounded-full items-center justify-center text-text-muted hover:text-primary
          hover:border-primary transition-all duration-200 shadow-md"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card-dark border border-border-dark
          rounded-lg text-text-muted hover:text-primary transition-all"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed left-0 top-0 h-full z-40 glass border-r border-border-dark
          transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block relative flex-shrink-0 h-full glass border-r border-border-dark">
        {sidebarContent}
      </div>
    </>
  );
}
