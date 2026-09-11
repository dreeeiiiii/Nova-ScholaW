import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence, LayoutGroup } from 'framer-motion';
import api from '../services/api.js';
import { ArrowLeft, FolderOpen, X, Search } from 'lucide-react';

const PAGE_SIZE = 20;
const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

const resolveUrl = (fileUrl) => fileUrl || '';

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

const Gallery = () => {
  const [media, setMedia] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [year, setYear] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const prefersReduced = useReducedMotion();

  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    let active = true;
    api
      .get('/categories')
      .then((res) => {
        if (active) setCategories(res.data.categories || []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const fetchBrowse = useCallback(
    async (offset, append) => {
      const params = { limit: PAGE_SIZE, offset };
      if (categoryId) params.category_id = categoryId;
      if (year) params.year = year;
      if (mediaType) params.media_type = mediaType;
      const res = await api.get('/gallery', { params });
      return { items: res.data.media || [], total: res.data.total || 0 };
    },
    [categoryId, year, mediaType]
  );

  const fetchSearch = useCallback(
    async (q) => {
      const res = await api.get('/gallery/search', { params: { q } });
      let items = res.data.media || [];
      if (categoryId) items = items.filter((m) => String(m.category_id) === String(categoryId));
      if (mediaType) items = items.filter((m) => m.media_type === mediaType);
      if (year) items = items.filter((m) => String(new Date(m.created_at).getFullYear()) === String(year));
      return { items, total: items.length };
    },
    [categoryId, mediaType, year]
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = debouncedSearch
        ? await fetchSearch(debouncedSearch)
        : await fetchBrowse(0, false);
      setMedia(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load gallery.');
      setMedia([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fetchBrowse, fetchSearch]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const handleLoadMore = async () => {
    if (debouncedSearch) return;
    setLoadingMore(true);
    try {
      const result = await fetchBrowse(media.length, true);
      setMedia((prev) => [...prev, ...result.items]);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load more media.');
    } finally {
      setLoadingMore(false);
    }
  };

  const resetFilters = () => {
    setCategoryId('');
    setYear('');
    setMediaType('');
    setSearch('');
  };

  const hasMore = !debouncedSearch && media.length < total;

  const mediaTypeFilters = [
    { value: '', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
  ];

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
            <h1 className="font-heading text-xl font-bold text-text-main">Gallery</h1>
          </div>
          <Link
            to="/gallery/mine"
            className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill bg-surface px-4 py-2.5 text-xs font-semibold text-text-main hover:shadow-clay-hover"
          >
            <FolderOpen size={14} /> My Uploads
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Search + filters */}
        <div className="clay-card mb-6 rounded-clay p-5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search captions, filenames, categories…"
              className="clay-input w-full py-2.5 pl-9 pr-4 text-sm"
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="clay-input w-full bg-base px-4 py-2.5 text-sm text-text-main sm:w-auto"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="clay-input w-full bg-base px-4 py-2.5 text-sm text-text-main sm:w-auto"
            >
              <option value="">All years</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <LayoutGroup>
              <div className="flex flex-wrap gap-2">
                {mediaTypeFilters.map((opt) => (
                  <motion.button
                    key={opt.label}
                    type="button"
                    onClick={() => setMediaType(opt.value)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={`relative rounded-clay-pill px-4 py-2 text-xs font-bold transition-colors ${
                      mediaType === opt.value
                        ? 'bg-primary text-white shadow-clay-sm'
                        : 'bg-surface text-text-muted hover:text-primary'
                    }`}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </LayoutGroup>
            {(categoryId || year || mediaType || search) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-text-muted">
            {loading ? 'Loading…' : `${total} item${total === 1 ? '' : 's'} found`}
            {debouncedSearch ? ` for "${debouncedSearch}"` : ''}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="clay-card animate-clay-pulse overflow-hidden rounded-clay">
                <div className="aspect-square bg-primary/5" />
                <div className="p-3">
                  <div className="h-3 w-3/4 rounded-clay-pill bg-primary/10" />
                  <div className="mt-2 h-2 w-1/2 rounded-clay-pill bg-primary/10" />
                </div>
              </div>
            ))}
          </div>
        ) : media.length === 0 ? (
          <div className="clay-card rounded-clay p-8 text-center">
            <FolderOpen size={40} className="mx-auto mb-3 text-primary/30" />
            <p className="text-sm text-text-muted">No media found. Try different filters or search.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {media.map((item, idx) => (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReduced ? { duration: 0 } : { delay: Math.min(idx * 0.04, 0.4), duration: 0.35 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="clay-card overflow-hidden rounded-clay text-left transition-shadow hover:shadow-clay-hover focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="relative aspect-square bg-primary/5">
                    {item.media_type === 'video' ? (
                      <div className="relative h-full w-full">
                        <video src={resolveUrl(item.file_url)} className="h-full w-full object-cover" preload="metadata" />
                        <span className="absolute inset-0 flex items-center justify-center bg-text-main/20">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-lg text-text-main shadow-clay-sm">
                            ▶
                          </span>
                        </span>
                      </div>
                    ) : (
                      <img
                        src={resolveUrl(item.file_url)}
                        alt={displayTitle(item)}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-text-main">{displayTitle(item)}</p>
                    <p className="mt-1 flex items-center justify-between text-xs text-text-muted">
                      <span className="truncate">{item.category_name || 'Uncategorized'}</span>
                      <span className="ml-2 shrink-0">{formatDate(item.created_at)}</span>
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <motion.button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="clay-btn rounded-clay-pill bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-clay disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more (${media.length} of ${total})`}
                </motion.button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
                  <p className="mt-1 text-xs text-text-muted">
                    {selected.category_name || 'Uncategorized'} · {formatDate(selected.created_at)}
                    {selected.uploader_name ? ` · by ${selected.uploader_name}` : ''}
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setSelected(null)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close"
                  className="clay-btn-sm flex h-8 w-8 items-center justify-center rounded-clay-pill bg-surface text-text-muted"
                >
                  <X size={16} />
                </motion.button>
              </div>
              {selected.media_type === 'video' ? (
                <video src={resolveUrl(selected.file_url)} controls className="max-h-[65vh] w-full rounded-clay bg-text-main" />
              ) : (
                <img
                  src={resolveUrl(selected.file_url)}
                  alt={displayTitle(selected)}
                  className="max-h-[65vh] w-full rounded-clay object-contain bg-primary/5"
                />
              )}
              {selected.caption && <p className="mt-3 text-sm text-text-muted">{selected.caption}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
