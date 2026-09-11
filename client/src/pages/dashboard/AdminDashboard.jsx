import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { motion, useReducedMotion } from 'framer-motion';
import { Users, Megaphone, Image, ShieldCheck, ScrollText, Plus } from 'lucide-react';

const StatCard = ({ label, value, breakdown, accent, icon: Icon, index }) => {
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
        <div className={`flex h-10 w-10 items-center justify-center rounded-clay-sm ${accent}/15`}>
          <Icon size={18} className={accent} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
        </div>
      </div>
      {breakdown && (
        <div className="mt-3 space-y-1 border-t border-primary/10 pt-3">
          {breakdown.map(({ key, val }) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="capitalize text-text-muted">{key}</span>
              <span className="font-semibold text-text-main">{val}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const formatTimestamp = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/audit-logs', { params: { limit: 10, offset: 0 } }),
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data.logs || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard stats.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Users"
          value={stats?.users?.total ?? 0}
          accent="text-primary"
          icon={Users}
          index={0}
          breakdown={[
            { key: 'admin', val: stats?.users?.admin ?? 0 },
            { key: 'teacher', val: stats?.users?.teacher ?? 0 },
            { key: 'student', val: stats?.users?.student ?? 0 },
          ]}
        />
        <StatCard
          label="Total Announcements"
          value={stats?.announcements?.total ?? 0}
          accent="text-success"
          icon={Megaphone}
          index={1}
          breakdown={[
            { key: 'general', val: stats?.announcements?.general ?? 0 },
            { key: 'class', val: stats?.announcements?.class ?? 0 },
          ]}
        />
        <StatCard
          label="Total Gallery Media"
          value={stats?.gallery?.total ?? 0}
          accent="text-warning"
          icon={Image}
          index={2}
          breakdown={[
            { key: 'pending', val: stats?.gallery?.pending ?? 0 },
            { key: 'approved', val: stats?.gallery?.approved ?? 0 },
            { key: 'rejected', val: stats?.gallery?.rejected ?? 0 },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { delay: 0.25, duration: 0.4 }}
          className="clay-card rounded-clay p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-text-main">Recent Activity</h2>
            <Link to="/admin/audit-logs" className="text-xs font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-text-muted">No recent activity yet.</p>
          ) : (
            <ul className="divide-y divide-primary/10">
              {activity.map((log) => (
                <li key={log.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text-main">{log.action}</span>
                    <span className="shrink-0 text-xs text-text-muted">{formatTimestamp(log.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {log.user_name || log.user_email || 'System'} · {log.entity_type}
                    {log.entity_id ? ` #${log.entity_id}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : { delay: 0.35, duration: 0.4 }}
          className="clay-card rounded-clay p-5"
        >
          <h2 className="mb-3 font-heading text-base font-bold text-text-main">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { to: '/admin/users', label: 'Manage Users', icon: Users, accent: 'bg-primary' },
              { to: '/admin/moderation', label: `Moderate Gallery${stats?.gallery?.pending ? ` (${stats.gallery.pending})` : ''}`, icon: ShieldCheck, accent: 'bg-warning' },
              { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, accent: 'bg-surface' },
              { to: '/announcements/create', label: 'Create Announcement', icon: Plus, accent: 'bg-surface' },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`clay-btn-sm flex items-center justify-center gap-2 rounded-clay-pill px-4 py-2.5 text-center text-xs font-bold transition-all ${
                  action.accent === 'bg-surface'
                    ? 'bg-surface text-text-main hover:shadow-clay-hover'
                    : `${action.accent} text-white hover:shadow-clay-hover`
                }`}
              >
                <action.icon size={14} />
                {action.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
