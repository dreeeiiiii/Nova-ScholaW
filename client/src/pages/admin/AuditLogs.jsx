import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

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
  const [appliedAction, setAppliedAction] = useState('');
  const [appliedEntity, setAppliedEntity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (appliedAction) params.action = appliedAction;
      if (appliedEntity) params.entity_type = appliedEntity;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, appliedAction, appliedEntity]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedAction(actionFilter.trim());
    setAppliedEntity(entityFilter.trim());
  };

  const clearFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setAppliedAction('');
    setAppliedEntity('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-white">Audit Logs</h1>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
            admin
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <form onSubmit={applyFilters} className="mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="audit-action" className="block text-xs font-medium text-slate-400">Action</label>
            <input
              id="audit-action"
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. announcement.create"
              className="mt-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="audit-entity" className="block text-xs font-medium text-slate-400">Entity type</label>
            <input
              id="audit-entity"
              type="text"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder="e.g. announcement"
              className="mt-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900"
            />
          </div>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Filter
          </button>
          <button type="button" onClick={clearFilters} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800">
            Clear
          </button>
          <span className="ml-auto text-sm text-slate-400">{total} total</span>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">No audit logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatTimestamp(log.created_at)}</td>
                    <td className="px-4 py-3 text-slate-900">{log.user_name || log.user_email || <span className="text-slate-400">System</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{log.action}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-500" title={typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details ?? '')}>
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  );
};

export default AuditLogs;
