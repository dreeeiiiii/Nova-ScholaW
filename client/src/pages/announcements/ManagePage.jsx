import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AnnouncementCard from '../../components/announcements/AnnouncementCard.jsx';

const ManagePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const isAdmin = user?.role === 'admin';

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit, offset: (page - 1) * limit };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/announcements', { params });
      setAnnouncements(res.data.announcements || []);
      setTotal(res.data.total || res.data.announcements.length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, page, isAdmin]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDeleteSuccess = () => {
    fetchAnnouncements();
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-slate-400 hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">Manage Announcements</h1>
          </div>
          <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
            {user?.role}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900"
          >
            <option value="">All Types</option>
            <option value="general">General</option>
            <option value="class">Class</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500">No announcements found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-semibold text-slate-500 uppercase">
              <div className="col-span-4">Title</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Publish At</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2">Actions</div>
            </div>
            {announcements.map((a) => (
              <div key={a.id} className="grid grid-cols-12 gap-4 items-center rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
                <div className="col-span-4">
                  <span className="font-medium text-slate-900">{a.title}</span>
                </div>
                <div className="col-span-1">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${a.type === 'general' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {a.type}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                    a.status === 'published' ? 'bg-green-100 text-green-800' :
                    a.status === 'scheduled' ? 'bg-amber-100 text-amber-800' :
                    a.status === 'archived' ? 'bg-red-100 text-red-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {a.status}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-slate-600">
                  {a.publish_at ? new Date(a.publish_at).toLocaleString() : '—'}
                </div>
                <div className="col-span-2 text-sm text-slate-600">
                  {new Date(a.created_at).toLocaleString()}
                </div>
                <div className="col-span-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/announcements/${a.id}/edit`)}
                    className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this announcement?')) {
                        api.delete(`/announcements/${a.id}`).then(() => {
                          handleDeleteSuccess();
                        }).catch(() => {});
                      }
                    }}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManagePage;
