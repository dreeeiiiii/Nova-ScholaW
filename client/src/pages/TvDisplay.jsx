import { useState, useEffect } from 'react';
import api from '../services/api.js';

const TvDisplay = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  const fetchTvAnnouncements = async () => {
    try {
      const res = await api.get('/announcements/tv');
      setAnnouncements(res.data.announcements || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTvAnnouncements();
    const interval = setInterval(fetchTvAnnouncements, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (announcements.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [announcements]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-xl text-slate-400">Loading announcements…</p>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 p-6 text-center">
        <div>
          <p className="text-2xl font-bold text-white">Nova Schola Hub</p>
          <p className="mt-2 text-xl text-slate-400">No announcements to display</p>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex % announcements.length];

  return (
    <div className="flex h-screen w-full flex-col bg-slate-900">
      <div className="fixed top-4 right-4 z-10 flex items-center gap-3 text-sm text-slate-500">
        <span>Nova Schola Hub</span>
        <span className="rounded bg-slate-800 px-2 py-1 font-mono text-slate-400">
          {time.toLocaleTimeString()}
        </span>
      </div>

      <div className="flex h-full items-center justify-center p-6 sm:p-12">
        <div className="max-w-4xl w-full text-center">
          {current.image_url && (
            <img
              src={current.image_url}
              alt=""
              className="mx-auto mb-6 max-h-40 rounded-xl object-cover shadow-lg sm:mb-8 sm:max-h-64"
            />
          )}
          <h1 className="mb-4 text-3xl font-bold text-white sm:mb-6 sm:text-5xl break-words">{current.title}</h1>
          <p className="text-lg text-slate-300 leading-relaxed sm:text-2xl break-words">{current.content}</p>
          <div className="mt-8">
            <div className="mx-auto h-2 w-48 rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
                style={{ width: `${((currentIndex + 1) / announcements.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {currentIndex + 1} of {announcements.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TvDisplay;
