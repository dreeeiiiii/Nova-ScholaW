import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { motion, useReducedMotion } from 'framer-motion';
import { Megaphone, Image, Eye, Upload, FolderOpen } from 'lucide-react';

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
    // storage unavailable
  }
};

const CountCard = ({ label, value, accent, icon: Icon, index }) => {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="clay-card rounded-clay p-5"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-clay-sm ${accent}/15`}>
            <Icon size={18} className={accent} />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

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
  const prefersReduced = useReducedMotion();

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
      <div className="space-y-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="clay-card animate-clay-pulse rounded-clay p-5">
              <div className="h-4 w-24 rounded-clay-pill bg-primary/10" />
              <div className="mt-2 h-8 w-16 rounded-clay-pill bg-primary/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
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
        <h2 className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-text-muted">Announcements For Me</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CountCard label="Unread" value={unread} accent="text-primary" icon={Megaphone} index={0} />
          <CountCard label="Total visible" value={announcements.length} accent="text-text-main" icon={Eye} index={1} />
        </div>
        <p className="mt-2 text-xs text-text-muted">Read tracking is kept on this device.</p>
      </div>

      <div>
        <h2 className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-text-muted">My Uploads</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CountCard label="Pending" value={uploadCounts.pending} accent="text-warning" icon={Image} index={0} />
          <CountCard label="Approved" value={uploadCounts.approved} accent="text-success" icon={Image} index={1} />
          <CountCard label="Rejected" value={uploadCounts.rejected} accent="text-danger" icon={Image} index={2} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { delay: 0.25, duration: 0.4 }}
          className="clay-card rounded-clay p-5"
        >
          <h2 className="mb-3 font-heading text-base font-bold text-text-main">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              { to: '/announcements', label: 'View Announcements', icon: Megaphone, primary: true },
              { to: '/gallery', label: 'Browse Gallery', icon: FolderOpen, primary: false },
              { to: '/gallery/upload', label: 'Upload Media', icon: Upload, primary: false },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`clay-btn-sm flex items-center justify-center gap-2 rounded-clay-pill px-4 py-2.5 text-center text-xs font-bold transition-all ${
                  action.primary
                    ? 'bg-primary text-white hover:shadow-clay-hover'
                    : 'bg-surface text-text-main hover:shadow-clay-hover'
                }`}
              >
                <action.icon size={14} />
                {action.label}
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { delay: 0.35, duration: 0.4 }}
          className="clay-card rounded-clay p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-text-main">Recent Announcements</h2>
            <Link to="/announcements" className="text-xs font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-text-muted">No announcements visible to you yet.</p>
          ) : (
            <ul className="divide-y divide-primary/10">
              {recent.map((a) => {
                const isRead = readIds.has(a.id);
                return (
                  <li key={a.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold ${isRead ? 'text-text-muted' : 'text-text-main'}`}>
                        {!isRead && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />}
                        {a.title}
                      </span>
                      <span className="shrink-0 text-xs text-text-muted">{formatDate(a.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-text-muted">{a.content}</p>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(a.id)}
                        className="mt-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDashboard;
