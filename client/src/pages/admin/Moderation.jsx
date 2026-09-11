import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import api from '../../services/api.js';
import { ArrowLeft, ShieldCheck, X, Image, AlertTriangle } from 'lucide-react';

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
  const prefersReduced = useReducedMotion();

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
    <div className="min-h-screen bg-base font-body text-text-main">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/dashboard"
            className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3 py-2 text-xs font-semibold text-text-muted"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="font-heading text-xl font-bold text-text-main">Media Moderation</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger"
            >
              {error}
            </motion.div>
          )}
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 rounded-clay bg-success/15 px-4 py-3 text-sm font-medium text-success"
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="clay-card animate-clay-pulse overflow-hidden rounded-clay">
                <div className="aspect-video bg-primary/5" />
                <div className="p-4">
                  <div className="h-4 w-3/4 rounded-clay-pill bg-primary/10" />
                  <div className="mt-2 h-2 w-1/2 rounded-clay-pill bg-primary/10" />
                </div>
              </div>
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="clay-card rounded-clay p-10 text-center">
            <ShieldCheck size={48} className="mx-auto mb-3 text-success/40" />
            <p className="text-sm font-medium text-text-muted">No pending media. You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReduced ? { duration: 0 } : { delay: idx * 0.06, duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="clay-card overflow-hidden rounded-clay transition-shadow hover:shadow-clay-hover"
              >
                <div className="relative aspect-video bg-primary/5">
                  {item.media_type === 'video' ? (
                    <div className="relative h-full w-full">
                      <video src={item.file_url} className="h-full w-full object-cover" preload="metadata" />
                      <span className="absolute inset-0 flex items-center justify-center bg-text-main/20">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-lg text-text-main shadow-clay-sm">▶</span>
                      </span>
                    </div>
                  ) : (
                    <img src={item.file_url} alt={displayTitle(item)} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-bold text-text-main">{displayTitle(item)}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {item.uploader_name || item.uploader_email || 'Unknown uploader'} ·{' '}
                    {item.category_name || 'Uncategorized'} · {formatDate(item.created_at)}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <motion.button
                      type="button"
                      onClick={() => setPreview(item)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="clay-btn-sm flex-1 rounded-clay-pill bg-surface px-3 py-2 text-xs font-semibold text-text-main"
                    >
                      Preview
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => handleApprove(item)}
                      disabled={acting}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="clay-btn-sm flex-1 rounded-clay-pill bg-success px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Approve
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => openReject(item)}
                      disabled={acting}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="clay-btn-sm flex-1 rounded-clay-pill bg-danger px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Reject
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/60 p-4 backdrop-blur-sm"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
              className="clay-card max-h-[90vh] w-full max-w-3xl overflow-auto rounded-clay p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-lg font-bold text-text-main">{displayTitle(preview)}</h2>
                  <p className="mt-1 text-xs text-text-muted">
                    {preview.uploader_name || preview.uploader_email || ''} ·{' '}
                    {preview.category_name || 'Uncategorized'} · {formatDate(preview.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="Close"
                  className="clay-btn-sm flex h-8 w-8 items-center justify-center rounded-clay-pill bg-surface text-text-muted"
                >
                  <X size={16} />
                </button>
              </div>
              {preview.media_type === 'video' ? (
                <video src={preview.file_url} controls className="max-h-[60vh] w-full rounded-clay bg-text-main" />
              ) : (
                <img src={preview.file_url} alt={displayTitle(preview)} className="max-h-[60vh] w-full rounded-clay bg-primary/5 object-contain" />
              )}
              <div className="mt-4 flex justify-end gap-2">
                <motion.button
                  type="button"
                  onClick={() => handleApprove(preview)}
                  disabled={acting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="clay-btn rounded-clay-pill bg-success px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  Approve
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => openReject(preview)}
                  disabled={acting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="clay-btn rounded-clay-pill bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  Reject
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
              className="clay-card w-full max-w-md rounded-clay p-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={18} className="text-danger" />
                <h2 className="font-heading text-lg font-bold text-text-main">
                  Reject &ldquo;{displayTitle(rejectTarget)}&rdquo;
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                A reason is required (minimum 10 characters). The uploader will see it.
              </p>
              <form onSubmit={handleReject} className="mt-4 space-y-3" noValidate>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this media was rejected…"
                  className="clay-input block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted"
                />
                {rejectError && (
                  <div className="rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
                    {rejectError}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setRejectTarget(null)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2.5 text-sm font-semibold text-text-main"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={acting}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="clay-btn rounded-clay-pill bg-danger px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {acting ? 'Rejecting…' : 'Reject media'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Moderation;
