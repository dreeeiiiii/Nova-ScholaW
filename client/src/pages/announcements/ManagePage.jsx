import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';

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
  const prefersReduced = useReducedMotion();

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

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleDeleteSuccess = () => { fetchAnnouncements(); };

  const typeBadge = (type) => (
    <span className={`rounded-clay-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${type === 'general' ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'}`}>
      {type}
    </span>
  );

  const statusBadge = (status) => (
    <span className={`rounded-clay-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
      status === 'published' ? 'bg-success/15 text-success' :
      status === 'scheduled' ? 'bg-warning/15 text-warning' :
      status === 'archived' ? 'bg-danger/15 text-danger' :
      'bg-text-muted/15 text-text-muted'
    }`}>
      {status}
    </span>
  );

  return (
    <div className="min-h-screen bg-base font-body text-text-main">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3 py-2 text-xs font-semibold text-text-muted"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h1 className="font-heading text-xl font-bold text-text-main">Manage Announcements</h1>
          </div>
          <span className="rounded-clay-pill bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            {user?.role}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="clay-card mb-6 flex flex-wrap gap-3 rounded-clay p-5">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="clay-input bg-base px-4 py-2.5 text-sm text-text-main"
          >
            <option value="">All Types</option>
            <option value="general">General</option>
            <option value="class">Class</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="clay-input bg-base px-4 py-2.5 text-sm text-text-main"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="clay-card animate-clay-pulse rounded-clay p-4">
                <div className="flex gap-4">
                  <div className="h-4 w-1/3 rounded-clay-pill bg-primary/10" />
                  <div className="h-4 w-16 rounded-clay-pill bg-primary/10" />
                  <div className="h-4 w-16 rounded-clay-pill bg-primary/10" />
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="clay-card rounded-clay p-8 text-center">
            <p className="text-sm text-text-muted">No announcements found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 pb-2 text-[10px] font-bold uppercase text-text-muted">
              <div className="col-span-4">Title</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Publish At</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2">Actions</div>
            </div>
            {announcements.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReduced ? { duration: 0 } : { delay: Math.min(idx * 0.04, 0.3), duration: 0.3 }}
                className="clay-card grid grid-cols-1 gap-2 rounded-clay p-4 transition-shadow hover:shadow-clay-hover sm:grid-cols-12 sm:gap-4 sm:items-center"
              >
                <div className="sm:col-span-4">
                  <span className="font-bold text-text-main break-words">{a.title}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-1">
                  {typeBadge(a.type)}
                </div>
                <div className="sm:col-span-1">
                  {statusBadge(a.status)}
                </div>
                <div className="text-sm text-text-muted break-words sm:col-span-2">
                  {a.publish_at ? new Date(a.publish_at).toLocaleString() : '—'}
                </div>
                <div className="text-sm text-text-muted break-words sm:col-span-2">
                  {new Date(a.created_at).toLocaleString()}
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <motion.button
                    type="button"
                    onClick={() => navigate(`/announcements/${a.id}/edit`)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="clay-btn-sm flex items-center gap-1 rounded-clay-pill bg-primary/15 px-3 py-1.5 text-[10px] font-semibold text-primary"
                  >
                    <Pencil size={10} /> Edit
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this announcement?')) {
                        api.delete(`/announcements/${a.id}`).then(() => {
                          handleDeleteSuccess();
                        }).catch(() => {});
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="clay-btn-sm flex items-center gap-1 rounded-clay-pill bg-danger/15 px-3 py-1.5 text-[10px] font-semibold text-danger"
                  >
                    <Trash2 size={10} /> Delete
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {total > limit && (
          <div className="mt-4 flex items-center justify-between">
            <motion.button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2 text-xs font-semibold text-text-main disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </motion.button>
            <span className="text-xs text-text-muted">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
            <motion.button
              type="button"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage((p) => p + 1)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2 text-xs font-semibold text-text-main disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManagePage;
