import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence, LayoutGroup } from 'framer-motion';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AnnouncementCard from '../components/announcements/AnnouncementCard.jsx';
import CreateAnnouncement from './announcements/Create.jsx';
import { ArrowLeft, Plus, Settings, Megaphone } from 'lucide-react';

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const prefersReduced = useReducedMotion();

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const roleFilter = isTeacherOrAdmin ? searchParams.get('type') || '' : '';

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter && isTeacherOrAdmin) params.type = roleFilter;
      const res = await api.get('/announcements', { params });
      setAnnouncements(res.data.announcements || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roleFilter, isTeacherOrAdmin]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleTypeFilter = (type) => {
    if (type === '') {
      setSearchParams({});
    } else {
      setSearchParams({ type });
    }
  };

  const handleCreateSuccess = () => {
    setShowCreate(false);
    fetchAnnouncements();
  };

  const handleDeleteSuccess = () => {
    fetchAnnouncements();
  };

  const filterTypes = [
    { value: '', label: 'All' },
    { value: 'general', label: 'General' },
    { value: 'class', label: 'Class' },
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
            <h1 className="font-heading text-xl font-bold text-text-main">Announcements</h1>
          </div>
          <div className="flex items-center gap-2">
            {isTeacherOrAdmin && (
              <motion.button
                type="button"
                onClick={() => setShowCreate(!showCreate)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="clay-btn flex items-center gap-1.5 rounded-clay-pill bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-clay"
              >
                <Plus size={14} />
                {showCreate ? 'Cancel' : 'Create Announcement'}
              </motion.button>
            )}
            {isTeacherOrAdmin && (
              <Link
                to="/announcements/manage"
                className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill bg-surface px-4 py-2.5 text-xs font-semibold text-text-main hover:shadow-clay-hover"
              >
                <Settings size={14} /> Manage
              </Link>
            )}
            <span className="rounded-clay-pill bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              {user?.role}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence>
          {showCreate && isTeacherOrAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <CreateAnnouncement onSuccess={handleCreateSuccess} onCancel={() => setShowCreate(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {isTeacherOrAdmin && (
          <LayoutGroup>
            <div className="mb-6 flex flex-wrap gap-2">
              {filterTypes.map((ft) => (
                <motion.button
                  key={ft.value}
                  type="button"
                  onClick={() => handleTypeFilter(ft.value)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={`relative rounded-clay-pill px-4 py-2 text-xs font-bold transition-colors ${
                    roleFilter === ft.value
                      ? 'bg-primary text-white shadow-clay-sm'
                      : 'bg-surface text-text-muted hover:text-primary'
                  }`}
                >
                  {ft.label}
                </motion.button>
              ))}
            </div>
          </LayoutGroup>
        )}

        {loading ? (
          <div className="space-y-4 py-12">
            {[0, 1, 2].map((i) => (
              <div key={i} className="clay-card animate-clay-pulse rounded-clay p-6">
                <div className="h-5 w-48 rounded-clay-pill bg-primary/10" />
                <div className="mt-3 h-3 w-full rounded-clay-pill bg-primary/10" />
                <div className="mt-2 h-3 w-2/3 rounded-clay-pill bg-primary/10" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="clay-card rounded-clay p-8 text-center">
            <Megaphone size={40} className="mx-auto mb-3 text-primary/30" />
            <p className="text-sm text-text-muted">No announcements found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} onDelete={handleDeleteSuccess} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Announcements;
