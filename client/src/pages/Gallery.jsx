import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

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
  const [mediaType, setMediaType] = useState(''); // '' | 'image' | 'video'
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

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
      .catch(() => {
        // categories optional for browsing; keep empty on failure
      });
    return () => {
      active = false;
    };
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
      // Apply dropdown filters client-side on search results
      if (categoryId) items = items.filter((m) => String(m.category_id) === String(categoryId));
      if (mediaType) items = items.filter((m) => m.media_type === mediaType);
      if (year)
        items = items.filter((m) => String(new Date(m.created_at).getFullYear()) === String(year));
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
    if (debouncedSearch) return; // search returns all (≤50), no pagination
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

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-white">Gallery</h1>
          </div>
          <Link
            to="/gallery/mine"
            className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-600"
          >
            My Uploads
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Search + filters */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions, filenames, categories…"
            className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none sm:w-auto"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none sm:w-auto"
            >
              <option value="">All years</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {[
                { value: '', label: 'All' },
                { value: 'image', label: 'Images' },
                { value: 'video', label: 'Videos' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setMediaType(opt.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    mediaType === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(categoryId || year || mediaType || search) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {loading ? 'Loading…' : `${total} item${total === 1 ? '' : 's'} found`}
            {debouncedSearch ? ` for "${debouncedSearch}"` : ''}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : media.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">No media found. Try different filters or search.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="overflow-hidden rounded-xl bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <div className="relative aspect-square bg-slate-100">
                    {item.media_type === 'video' ? (
                      <div className="relative h-full w-full">
                        <video
                          src={resolveUrl(item.file_url)}
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-lg text-slate-900">
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
                    <p className="truncate text-sm font-medium text-slate-900">
                      {displayTitle(item)}
                    </p>
                    <p className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate">{item.category_name || 'Uncategorized'}</span>
                      <span className="ml-2 shrink-0">{formatDate(item.created_at)}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more (${media.length} of ${total})`}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox modal */}
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
                <p className="mt-1 text-xs text-slate-500">
                  {selected.category_name || 'Uncategorized'} • {formatDate(selected.created_at)}
                  {selected.uploader_name ? ` • by ${selected.uploader_name}` : ''}
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
              <video src={resolveUrl(selected.file_url)} controls className="max-h-[65vh] w-full rounded-lg bg-black" />
            ) : (
              <img
                src={resolveUrl(selected.file_url)}
                alt={displayTitle(selected)}
                className="max-h-[65vh] w-full rounded-lg object-contain bg-slate-100"
              />
            )}
            {selected.caption && <p className="mt-3 text-sm text-slate-700">{selected.caption}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
