import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AnnouncementCard from '../components/announcements/AnnouncementCard.jsx';
import CreateAnnouncement from './announcements/Create.jsx';

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

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

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-white">Announcements</h1>
          </div>
          <div className="flex items-center gap-3">
            {isTeacherOrAdmin && (
              <button
                type="button"
                onClick={() => setShowCreate(!showCreate)}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {showCreate ? 'Cancel' : '+ Create Announcement'}
              </button>
            )}
            <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              {user?.role}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {showCreate && isTeacherOrAdmin && (
          <div className="mb-8">
            <CreateAnnouncement onSuccess={handleCreateSuccess} onCancel={() => setShowCreate(false)} />
          </div>
        )}

        {isTeacherOrAdmin && (
          <div className="mb-6 flex gap-2">
            {['', 'general', 'class'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeFilter(type)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  roleFilter === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {type === '' ? 'All' : type === 'general' ? 'General' : 'Class'}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500">No announcements found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Announcements;
