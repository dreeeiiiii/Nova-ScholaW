import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { motion, useReducedMotion } from 'framer-motion';
import { Megaphone, Image, Plus, Upload, Settings, FolderOpen } from 'lucide-react';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

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

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [mine, setMine] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const prefersReduced = useReducedMotion();

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
      <div className="space-y-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
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
        <h2 className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-text-muted">My Announcements</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CountCard label="This week" value={thisWeek} accent="text-primary" icon={Megaphone} index={0} />
          <CountCard label="This month" value={thisMonth} accent="text-primary" icon={Megaphone} index={1} />
          <CountCard label="All time" value={mine.length} accent="text-primary" icon={Megaphone} index={2} />
        </div>
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
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { to: '/announcements/create', label: 'Create Announcement', icon: Plus, primary: true },
              { to: '/gallery/upload', label: 'Upload Media', icon: Upload, primary: false },
              { to: '/announcements/manage', label: 'Manage Announcements', icon: Settings, primary: false },
              { to: '/gallery/mine', label: 'My Uploads', icon: FolderOpen, primary: false },
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
          <h2 className="mb-3 font-heading text-base font-bold text-text-main">My Recent Announcements</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-text-muted">
              You haven&apos;t posted any announcements yet.{' '}
              <Link to="/announcements/create" className="font-semibold text-primary hover:underline">
                Create one →
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-primary/10">
              {recent.map((a) => (
                <li key={a.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text-main">{a.title}</span>
                    <span className="shrink-0 text-xs text-text-muted">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    <span className={`inline-block rounded-clay-pill px-2 py-0.5 font-semibold ${a.type === 'general' ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'}`}>
                      {a.type}
                    </span>{' '}
                    · {a.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
