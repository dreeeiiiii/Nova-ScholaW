import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

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

const Moderation = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [acting, setActing] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/gallery/pending');
      setPending(res.data.media || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending media.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  const handleApprove = async (item) => {
    setActing(true);
    setError('');
    try {
      await api.patch(`/gallery/${item.id}/approve`);
      setPending((prev) => prev.filter((m) => m.id !== item.id));
      setPreview(null);
      showNotice(`Approved "${displayTitle(item)}".`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve media.');
    } finally {
      setActing(false);
    }
  };

  const openReject = (item) => {
    setRejectTarget(item);
    setRejectReason('');
    setRejectError('');
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      setRejectError('Rejection reason is required (minimum 10 characters).');
      return;
    }
    setActing(true);
    setRejectError('');
    try {
      await api.patch(`/gallery/${rejectTarget.id}/reject`, {
        rejection_reason: rejectReason.trim(),
      });
      setPending((prev) => prev.filter((m) => m.id !== rejectTarget.id));
      setPreview(null);
      showNotice(`Rejected "${displayTitle(rejectTarget)}".`);
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject media.');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white">Media Moderation</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">No pending media. You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="relative aspect-video bg-slate-100">
                  {item.media_type === 'video' ? (
                    <div className="relative h-full w-full">
                      <video src={item.file_url} className="h-full w-full object-cover" preload="metadata" />
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-lg text-slate-900">
                          ▶
                        </span>
                      </span>
                    </div>
                  ) : (
                    <img
                      src={item.file_url}
                      alt={displayTitle(item)}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-semibold text-slate-900">{displayTitle(item)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.uploader_name || item.uploader_email || 'Unknown uploader'} •{' '}
                    {item.category_name || 'Uncategorized'} • {formatDate(item.created_at)}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setPreview(item)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                      disabled={acting}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => openReject(item)}
                      disabled={acting}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{displayTitle(preview)}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {preview.uploader_name || preview.uploader_email || ''} •{' '}
                  {preview.category_name || 'Uncategorized'} • {formatDate(preview.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {preview.media_type === 'video' ? (
              <video src={preview.file_url} controls className="max-h-[60vh] w-full rounded-lg bg-black" />
            ) : (
              <img
                src={preview.file_url}
                alt={displayTitle(preview)}
                className="max-h-[60vh] w-full rounded-lg bg-slate-100 object-contain"
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleApprove(preview)}
                disabled={acting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => openReject(preview)}
                disabled={acting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Reject &ldquo;{displayTitle(rejectTarget)}&rdquo;
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              A reason is required (minimum 10 characters). The uploader will see it.
            </p>
            <form onSubmit={handleReject} className="mt-4 space-y-3" noValidate>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this media was rejected…"
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              />
              {rejectError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {rejectError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acting}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {acting ? 'Rejecting…' : 'Reject media'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Moderation;
