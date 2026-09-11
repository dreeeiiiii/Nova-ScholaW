import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from 'framer-motion';
import AdminDashboard from './dashboard/AdminDashboard.jsx';
import TeacherDashboard from './dashboard/TeacherDashboard.jsx';
import StudentDashboard from './dashboard/StudentDashboard.jsx';
import {
  Megaphone,
  Image,
  Tv,
  Users,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  X,
  Home,
} from 'lucide-react';

const navItems = (role) => {
  const items = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/gallery', label: 'Gallery', icon: Image },
    { to: '/tv', label: 'TV Display', icon: Tv, external: true },
  ];
  if (role === 'admin') {
    items.push(
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/moderation', label: 'Moderation', icon: ShieldCheck },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText }
    );
  }
  return items;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const prefersReduced = useReducedMotion();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const items = navItems(user.role);

  return (
    <div className="min-h-screen bg-base font-body text-text-main">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-clay-sm bg-primary font-heading text-xs font-extrabold text-white shadow-clay-sm">
              NSH
            </Link>
            <div>
              <h1 className="font-heading text-lg font-bold text-text-main">Dashboard</h1>
              <p className="mt-0.5 text-xs text-text-muted">
                Welcome, <span className="font-semibold text-text-main">{user.full_name}</span>{' '}
                <span className="ml-1 inline-block rounded-clay-pill bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {user.role}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="clay-btn-sm flex h-10 w-10 items-center justify-center rounded-clay-pill bg-surface text-text-main md:hidden"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <nav className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 md:flex md:w-auto md:flex-row md:flex-wrap md:items-center`}>
            {items.map((item) => {
              const Icon = item.icon;
              return item.external ? (
                <a
                  key={item.to}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3.5 py-2 text-center text-xs font-semibold text-text-muted transition-all hover:text-primary"
                >
                  <Icon size={14} />
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3.5 py-2 text-center text-xs font-semibold text-text-muted transition-all hover:text-primary"
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
            <motion.button
              type="button"
              onClick={handleLogout}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill bg-danger/15 px-3.5 py-2 text-xs font-semibold text-danger transition-all hover:bg-danger/25"
            >
              <LogOut size={14} />
              Log out
            </motion.button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <LayoutGroup>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
          >
            {user.role === 'admin' && <AdminDashboard />}
            {user.role === 'teacher' && <TeacherDashboard />}
            {user.role === 'student' && <StudentDashboard />}
          </motion.div>
        </LayoutGroup>
      </main>
    </div>
  );
};

export default Dashboard;
