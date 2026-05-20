import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Star, User, Video } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Generate' },
  { to: '/video', icon: Video, label: 'Studio' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/favorites', icon: Star, label: 'Saved' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav-bar"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1 safe-area-bottom">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
            id={`bottom-nav-${label.toLowerCase()}`}
          >
            {({ isActive }) => (
              <>
                <div className={`bottom-nav-icon-wrap ${isActive ? 'active' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`bottom-nav-label ${isActive ? 'active' : ''}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
