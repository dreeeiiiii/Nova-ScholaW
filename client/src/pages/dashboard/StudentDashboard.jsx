import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const READ_KEY = 'ns_read_announcements';

const loadReadIds = () => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const saveReadIds = (set) => {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {
    // storage unavailable — read tracking silently disabled
  }
};

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

const StudentDashboard = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [readIds, setReadIds] = useState(() => loadReadIds());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [annRes, upRes] = await Promise.all([
        api.get('/announcements', { params: { limit: 50, offset: 0 } }),
        api.get('/gallery/mine'),
      ]);
      setAnnouncements(annRes.data.announcements || []);
      setUploads(upRes.data.media || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const markAsRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  };

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

  const unread = announcements.filter((a) => !readIds.has(a.id)).length;
  const uploadCounts = {
    pending: uploads.filter((m) => m.status === 'pending').length,
    approved: uploads.filter((m) => m.status === 'approved').length,
    rejected: uploads.filter((m) => m.status === 'rejected').length,
  };
  const recent = [...announcements]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Announcements For Me</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CountCard label="Unread" value={unread} accent="text-indigo-700" />
          <CountCard label="Total visible" value={announcements.length} accent="text-slate-900" />
        </div>
        <p className="mt-2 text-xs text-slate-500">Read tracking is kept on this device.</p>
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
          <div className="grid grid-cols-1 gap-2">
            <Link to="/announcements" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">
              View Announcements
            </Link>
            <Link to="/gallery" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Browse Gallery
            </Link>
            <Link to="/gallery/upload" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Upload Media
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Announcements</h2>
            <Link to="/announcements" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements visible to you yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((a) => {
                const isRead = readIds.has(a.id);
                return (
                  <li key={a.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium ${isRead ? 'text-slate-500' : 'text-slate-900'}`}>
                        {!isRead && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-indigo-600" />}
                        {a.title}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{formatDate(a.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.content}</p>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(a.id)}
                        className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Mark as read
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
