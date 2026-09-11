import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const CountCard = ({ label, value, accent }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
  </div>
);

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [mine, setMine] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [annRes, upRes] = await Promise.all([
          api.get('/announcements', { params: { limit: 100, offset: 0 } }),
          api.get('/gallery/mine'),
        ]);
        const all = annRes.data.announcements || [];
        setMine(all.filter((a) => a.author_id === user?.id));
        setUploads(upRes.data.media || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const now = Date.now();
  const thisWeek = mine.filter((a) => now - new Date(a.created_at).getTime() <= ONE_WEEK_MS).length;
  const thisMonth = mine.filter((a) => now - new Date(a.created_at).getTime() <= ONE_MONTH_MS).length;
  const uploadCounts = {
    pending: uploads.filter((m) => m.status === 'pending').length,
    approved: uploads.filter((m) => m.status === 'approved').length,
    rejected: uploads.filter((m) => m.status === 'rejected').length,
  };
  const recent = [...mine].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">My Announcements</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CountCard label="This week" value={thisWeek} accent="text-indigo-700" />
          <CountCard label="This month" value={thisMonth} accent="text-indigo-700" />
          <CountCard label="All time" value={mine.length} accent="text-indigo-700" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">My Uploads</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CountCard label="Pending" value={uploadCounts.pending} accent="text-amber-600" />
          <CountCard label="Approved" value={uploadCounts.approved} accent="text-emerald-700" />
          <CountCard label="Rejected" value={uploadCounts.rejected} accent="text-red-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link to="/announcements/create" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">
              Create Announcement
            </Link>
            <Link to="/gallery/upload" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Upload Media
            </Link>
            <Link to="/announcements/manage" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Manage Announcements
            </Link>
            <Link to="/gallery/mine" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              My Uploads
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">My Recent Announcements</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">
              You haven&apos;t posted any announcements yet.{' '}
              <Link to="/announcements/create" className="font-medium text-indigo-600 hover:text-indigo-800">
                Create one →
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((a) => (
                <li key={a.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{a.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className={`inline-block rounded-full px-2 py-0.5 font-medium ${a.type === 'general' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {a.type}
                    </span>{' '}
                    · {a.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
