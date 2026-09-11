import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const StatCard = ({ label, value, breakdown, accent }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
    {breakdown && (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
        {breakdown.map(({ key, val }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="capitalize text-slate-500">{key}</span>
            <span className="font-semibold text-slate-900">{val}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Users"
          value={stats?.users?.total ?? 0}
          accent="text-indigo-700"
          breakdown={[
            { key: 'admin', val: stats?.users?.admin ?? 0 },
            { key: 'teacher', val: stats?.users?.teacher ?? 0 },
            { key: 'student', val: stats?.users?.student ?? 0 },
          ]}
        />
        <StatCard
          label="Total Announcements"
          value={stats?.announcements?.total ?? 0}
          accent="text-emerald-700"
          breakdown={[
            { key: 'general', val: stats?.announcements?.general ?? 0 },
            { key: 'class', val: stats?.announcements?.class ?? 0 },
          ]}
        />
        <StatCard
          label="Total Gallery Media"
          value={stats?.gallery?.total ?? 0}
          accent="text-amber-700"
          breakdown={[
            { key: 'pending', val: stats?.gallery?.pending ?? 0 },
            { key: 'approved', val: stats?.gallery?.approved ?? 0 },
            { key: 'rejected', val: stats?.gallery?.rejected ?? 0 },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
            <Link to="/admin/audit-logs" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((log) => (
                <li key={log.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{log.action}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatTimestamp(log.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {log.user_name || log.user_email || 'System'} · {log.entity_type}
                    {log.entity_id ? ` #${log.entity_id}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link to="/admin/users" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">
              Manage Users
            </Link>
            <Link to="/admin/moderation" className="rounded-lg bg-amber-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-amber-700">
              Moderate Gallery{stats?.gallery?.pending ? ` (${stats.gallery.pending})` : ''}
            </Link>
            <Link to="/admin/audit-logs" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Audit Logs
            </Link>
            <Link to="/announcements/create" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Create Announcement
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
