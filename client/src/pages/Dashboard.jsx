import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AdminDashboard from './dashboard/AdminDashboard.jsx';
import TeacherDashboard from './dashboard/TeacherDashboard.jsx';
import StudentDashboard from './dashboard/StudentDashboard.jsx';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Welcome, <span className="font-semibold text-slate-200">{user.full_name}</span>{' '}
              <span className="ml-1 inline-block rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
                {user.role}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/announcements" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
              Announcements
            </Link>
            <Link to="/gallery" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
              Gallery
            </Link>
            <a href="/tv" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
              TV Display
            </a>
            {user.role === 'admin' && (
              <>
                <Link to="/admin/users" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                  Users
                </Link>
                <Link to="/admin/moderation" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                  Moderation
                </Link>
                <Link to="/admin/audit-logs" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                  Audit Logs
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'teacher' && <TeacherDashboard />}
        {user.role === 'student' && <StudentDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;
