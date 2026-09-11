import { useState, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import api from '../services/api.js';

const AmbientBlobs = () => {
  const prefersReduced = useReducedMotion();
  const dur = prefersReduced ? 0 : 22;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[140px]"
        animate={
          prefersReduced
            ? {}
            : { x: [0, 140, -70, 100, 0], y: [0, -100, 70, -50, 0] }
        }
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-secondary/15 blur-[140px]"
        animate={
          prefersReduced
            ? {}
            : { x: [0, -120, 90, -50, 0], y: [0, 70, -90, 50, 0] }
        }
        transition={{ duration: dur + 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

const TvDisplay = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const prefersReduced = useReducedMotion();

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
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-base">
        <AmbientBlobs />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-clay-pulse rounded-clay bg-primary/20" />
          <p className="text-xl font-semibold text-text-muted">Loading announcements…</p>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-base p-6 text-center">
        <AmbientBlobs />
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-clay bg-primary font-heading text-xl font-extrabold text-white shadow-clay">
            NSH
          </div>
          <p className="font-heading text-2xl font-extrabold text-text-main">Nova Schola Hub</p>
          <p className="mt-2 text-xl text-text-muted">No announcements to display</p>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex % announcements.length];

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-base">
      <AmbientBlobs />

      <div className="fixed top-4 right-4 z-10 flex items-center gap-3">
        <span className="clay-badge rounded-clay-pill px-3 py-1.5 text-xs font-bold text-text-main shadow-clay-sm">
          Nova Schola Hub
        </span>
        <motion.span
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="clay-badge rounded-clay-pill px-3 py-1.5 font-mono text-xs font-bold text-text-main shadow-clay-sm"
        >
          {time.toLocaleTimeString()}
        </motion.span>
      </div>

      <div className="relative z-10 flex h-full items-center justify-center p-6 sm:p-12">
        <div className="max-w-4xl w-full text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -20 }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
            >
              {current.image_url && (
                <img
                  src={current.image_url}
                  alt=""
                  className="mx-auto mb-6 max-h-40 rounded-clay object-cover shadow-clay sm:mb-8 sm:max-h-64"
                />
              )}
              <h1 className="mb-4 font-heading text-3xl font-extrabold text-text-main sm:mb-6 sm:text-5xl break-words">
                {current.title}
              </h1>
              <p className="text-lg leading-relaxed text-text-muted sm:text-2xl break-words">
                {current.content}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8">
            <div className="mx-auto h-2 w-48 overflow-hidden rounded-clay-pill bg-primary/15">
              <motion.div
                className="h-full rounded-clay-pill bg-primary"
                animate={{ width: `${((currentIndex + 1) / announcements.length) * 100}%` }}
                transition={prefersReduced ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {currentIndex + 1} of {announcements.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TvDisplay;
