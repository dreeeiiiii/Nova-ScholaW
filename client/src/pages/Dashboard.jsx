import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center p-10 bg-white rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-bold text-indigo-700">Dashboard</h1>
        <p className="mt-4 text-base text-slate-700">
          Welcome,{' '}
          <span className="font-semibold text-slate-900">{user.full_name}</span>{' '}
          <span className="inline-block ml-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-700">
            {user.role}
          </span>
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Auth is working — more dashboard content coming soon.
        </p>
        {user.role === 'admin' && (
          <div className="mt-6">
            <Link
              to="/admin/users"
              className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              Manage Users
            </Link>
            <div className="mt-3">
              <a
                href="/tv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                TV Display URL: /tv
              </a>
            </div>
          </div>
        )}
        <nav className="mt-6 flex flex-col gap-2">
          <Link
            to="/announcements"
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Announcements
          </Link>
          {(user.role === 'teacher' || user.role === 'admin') && (
            <Link
              to="/announcements/create"
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              Create Announcement
            </Link>
          )}
          {(user.role === 'teacher' || user.role === 'admin') && (
            <Link
              to="/announcements/manage"
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Manage Announcements
            </Link>
          )}
          <Link
            to="/gallery"
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Gallery
          </Link>
          <Link
            to="/gallery/upload"
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Upload Media
          </Link>
          <Link
            to="/gallery/mine"
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            My Uploads
          </Link>
          {user.role === 'admin' && (
            <Link
              to="/admin/moderation"
              className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              Moderate Gallery
            </Link>
          )}
        </nav>
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;