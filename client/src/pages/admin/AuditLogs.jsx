import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../../services/api.js';
import { ArrowLeft, ScrollText } from 'lucide-react';

const PAGE_SIZE = 20;

const formatTimestamp = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const formatDetails = (details) => {
  if (details === null || details === undefined) return '—';
  if (typeof details === 'object') {
    const str = JSON.stringify(details);
    return str.length > 120 ? `${str.slice(0, 120)}…` : str;
  }
  return String(details);
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [appliedAction, setAppliedAction] = useState('');
  const [appliedEntity, setAppliedEntity] = useState('');
  const [appliedUserId, setAppliedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const prefersReduced = useReducedMotion();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (appliedAction) params.action = appliedAction;
      if (appliedEntity) params.entity_type = appliedEntity;
      if (appliedUserId) params.user_id = appliedUserId;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, appliedAction, appliedEntity, appliedUserId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedAction(actionFilter.trim());
    setAppliedEntity(entityFilter.trim());
    setAppliedUserId(userFilter.trim());
  };

  const clearFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setUserFilter('');
    setAppliedAction('');
    setAppliedEntity('');
    setAppliedUserId('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const inputCls = 'clay-input block w-full px-4 py-2 text-sm text-text-main placeholder-text-muted';

  return (
    <div className="min-h-screen bg-base font-body text-text-main">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3 py-2 text-xs font-semibold text-text-muted"
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <h1 className="font-heading text-xl font-bold text-text-main">Audit Logs</h1>
          </div>
          <span className="rounded-clay-pill bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            admin
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <form onSubmit={applyFilters} className="clay-card mb-6 flex flex-col gap-3 rounded-clay p-5 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full sm:w-auto">
            <label htmlFor="audit-action" className="block text-[10px] font-bold uppercase tracking-wide text-text-muted">Action</label>
            <input id="audit-action" type="text" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="e.g. announcement.create" className={`${inputCls} mt-1.5 sm:w-auto`} />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="audit-entity" className="block text-[10px] font-bold uppercase tracking-wide text-text-muted">Entity type</label>
            <input id="audit-entity" type="text" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} placeholder="e.g. announcement" className={`${inputCls} mt-1.5 sm:w-auto`} />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="audit-user" className="block text-[10px] font-bold uppercase tracking-wide text-text-muted">User ID</label>
            <input id="audit-user" type="text" inputMode="numeric" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="e.g. 3" className={`${inputCls} mt-1.5 sm:w-28`} />
          </div>
          <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="clay-btn rounded-clay-pill bg-primary px-4 py-2 text-xs font-bold text-white shadow-clay">
            Filter
          </motion.button>
          <motion.button type="button" onClick={clearFilters} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2 text-xs font-semibold text-text-main hover:shadow-clay-hover">
            Clear
          </motion.button>
          <span className="ml-auto text-xs text-text-muted">{total} total</span>
        </form>

        {error && (
          <div className="mb-4 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="clay-card animate-clay-pulse rounded-clay p-4">
                <div className="flex gap-4">
                  <div className="h-3 w-28 rounded-clay-pill bg-primary/10" />
                  <div className="h-3 w-24 rounded-clay-pill bg-primary/10" />
                  <div className="h-3 w-32 rounded-clay-pill bg-primary/10" />
                  <div className="h-3 w-20 rounded-clay-pill bg-primary/10" />
                  <div className="h-3 w-40 rounded-clay-pill bg-primary/10" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="clay-card rounded-clay p-8 text-center">
            <ScrollText size={40} className="mx-auto mb-3 text-primary/30" />
            <p className="text-sm text-text-muted">No audit logs found.</p>
          </div>
        ) : (
          <div className="clay-card overflow-x-auto rounded-clay">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead>
                <tr>
                  {['Timestamp', 'User', 'Action', 'Entity', 'Details'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {logs.map((log, idx) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={prefersReduced ? { duration: 0 } : { delay: Math.min(idx * 0.03, 0.3), duration: 0.3 }}
                    className="transition-colors hover:bg-primary/5"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-text-muted">{formatTimestamp(log.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-text-main">{log.user_name || log.user_email || <span className="text-text-muted">System</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-text-main">{log.action}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-muted">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-text-muted" title={typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details ?? '')}>
                      {formatDetails(log.details)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
          <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
          <motion.button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2 text-xs font-semibold text-text-main disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default AuditLogs;
