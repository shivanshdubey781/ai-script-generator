import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, User, LogOut, ChevronDown, Zap } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function Navbar({ darkMode, setDarkMode }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="glass border-b border-border-dark px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Logo on mobile, greeting on desktop */}
      <div className="flex items-center gap-2.5">
        {/* App logo — only visible on mobile (desktop has sidebar) */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-text-primary text-sm">AI Script</span>
        </div>
        {/* Greeting — only visible on desktop */}
        <h1 className="text-sm font-semibold text-text-muted hidden lg:block">
          Welcome back, <span className="text-text-primary">{user?.full_name?.split(' ')[0]}</span> 👋
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-primary
            transition-all duration-200 border border-transparent hover:border-primary/30"
          aria-label="Toggle dark mode"
          id="dark-mode-toggle"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10
              border border-border-dark hover:border-primary/30 transition-all duration-200"
            id="user-avatar-btn"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent-green
              flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-text-primary hidden sm:block max-w-24 truncate">
              {user?.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-12 z-20 w-52 card shadow-xl border border-border-dark
                animate-slide-up overflow-hidden">
                <div className="p-3 border-b border-border-dark">
                  <p className="text-sm font-semibold text-text-primary truncate">{user?.full_name}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm
                      text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
                    id="profile-menu-btn"
                  >
                    <User size={15} />
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm
                      text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    id="logout-menu-btn"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
