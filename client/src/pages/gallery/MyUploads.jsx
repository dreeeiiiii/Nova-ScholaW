import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import api from '../../services/api.js';
import { ArrowLeft, FolderOpen, Upload, X } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
  const prefersReduced = useReducedMotion();

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
            <h1 className="font-heading text-xl font-bold text-text-main">My Uploads</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/gallery"
              className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill bg-surface px-4 py-2.5 text-xs font-semibold text-text-main hover:shadow-clay-hover"
            >
              <FolderOpen size={14} /> Gallery
            </Link>
            <Link
              to="/gallery/upload"
              className="clay-btn flex items-center gap-1.5 rounded-clay-pill bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-clay"
            >
              <Upload size={14} /> Upload Media
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {error && (
          <div className="mb-6 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

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
        ) : uploads.length === 0 ? (
          <div className="clay-card rounded-clay p-10 text-center">
            <FolderOpen size={48} className="mx-auto mb-3 text-primary/30" />
            <p className="text-sm font-medium text-text-muted">You haven&apos;t uploaded anything yet.</p>
            <Link
              to="/gallery/upload"
              className="clay-btn mt-4 inline-flex items-center gap-1.5 rounded-clay-pill bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-clay"
            >
              <Upload size={14} /> Upload Media
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReduced ? { duration: 0 } : { delay: idx * 0.06, duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="clay-card overflow-hidden rounded-clay transition-shadow hover:shadow-clay-hover"
              >
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="relative block aspect-video w-full bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {item.media_type === 'video' ? (
                    <span className="relative block h-full w-full">
                      <video src={item.file_url} className="h-full w-full object-cover" preload="metadata" />
                      <span className="absolute inset-0 flex items-center justify-center bg-text-main/20">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-lg text-text-main shadow-clay-sm">▶</span>
                      </span>
                    </span>
                  ) : (
                    <img src={item.file_url} alt={displayTitle(item)} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </button>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-text-main">{displayTitle(item)}</p>
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 15 }}
                      className={`shrink-0 rounded-clay-pill px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        STATUS_STYLES[item.status] || 'bg-text-muted/15 text-text-muted'
                      }`}
                    >
                      {item.status}
                    </motion.span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{formatDate(item.created_at)}</p>
                  {item.status === 'rejected' && item.rejection_reason && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mt-2 rounded-clay bg-danger/10 px-3 py-2 text-xs text-danger"
                    >
                      <span className="font-bold">Rejected: </span>
                      {item.rejection_reason}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/60 p-4 backdrop-blur-sm"
            onClick={() => setSelected(null)}
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
                  <h2 className="font-heading text-lg font-bold text-text-main">{displayTitle(selected)}</h2>
                  <p className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                    {formatDate(selected.created_at)}
                    <span className={`rounded-clay-pill px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      STATUS_STYLES[selected.status] || 'bg-text-muted/15 text-text-muted'
                    }`}>
                      {selected.status}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="clay-btn-sm flex h-8 w-8 items-center justify-center rounded-clay-pill bg-surface text-text-muted"
                >
                  <X size={16} />
                </button>
              </div>
              {selected.media_type === 'video' ? (
                <video src={selected.file_url} controls className="max-h-[60vh] w-full rounded-clay bg-text-main" />
              ) : (
                <img src={selected.file_url} alt={displayTitle(selected)} className="max-h-[60vh] w-full rounded-clay bg-primary/5 object-contain" />
              )}
              {selected.status === 'rejected' && selected.rejection_reason && (
                <p className="mt-3 rounded-clay bg-danger/10 px-4 py-3 text-sm text-danger">
                  <span className="font-bold">Rejection reason: </span>
                  {selected.rejection_reason}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyUploads;
