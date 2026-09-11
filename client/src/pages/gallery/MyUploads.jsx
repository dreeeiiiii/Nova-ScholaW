import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

const displayTitle = (item) => item.caption || item.original_filename || `Media #${item.id}`;

const MyUploads = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/gallery/mine');
      setUploads(res.data.media || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your uploads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-white">My Uploads</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/gallery"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Gallery
            </Link>
            <Link
              to="/gallery/upload"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              + Upload Media
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">You haven&apos;t uploaded anything yet.</p>
            <Link
              to="/gallery/upload"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Upload Media
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="relative block aspect-video w-full bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {item.media_type === 'video' ? (
                    <span className="relative block h-full w-full">
                      <video src={item.file_url} className="h-full w-full object-cover" preload="metadata" />
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-lg text-slate-900">
                          ▶
                        </span>
                      </span>
                    </span>
                  ) : (
                    <img
                      src={item.file_url}
                      alt={displayTitle(item)}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{displayTitle(item)}</p>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                        STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(item.created_at)}</p>
                  {item.status === 'rejected' && item.rejection_reason && (
                    <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <span className="font-semibold">Rejected: </span>
                      {item.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{displayTitle(selected)}</h2>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  {formatDate(selected.created_at)}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                      STATUS_STYLES[selected.status] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selected.status}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {selected.media_type === 'video' ? (
              <video src={selected.file_url} controls className="max-h-[60vh] w-full rounded-lg bg-black" />
            ) : (
              <img
                src={selected.file_url}
                alt={displayTitle(selected)}
                className="max-h-[60vh] w-full rounded-lg bg-slate-100 object-contain"
              />
            )}
            {selected.status === 'rejected' && selected.rejection_reason && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="font-semibold">Rejection reason: </span>
                {selected.rejection_reason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyUploads;
