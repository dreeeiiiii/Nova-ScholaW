import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { motion, useReducedMotion } from 'framer-motion';
import { Pencil, Trash2, Clock } from 'lucide-react';

const typeStyles = {
  general: 'bg-primary/15 text-primary',
  class: 'bg-secondary/15 text-secondary',
};

const statusStyles = {
  published: 'bg-success/15 text-success',
  scheduled: 'bg-warning/15 text-warning',
  expired: 'bg-danger/15 text-danger',
  draft: 'bg-text-muted/15 text-text-muted',
};

const getEffectiveStatus = (announcement) => {
  if (!announcement) return 'draft';
  const now = new Date();
  const publishAt = announcement.publish_at ? new Date(announcement.publish_at) : null;
  const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null;
  if (announcement.status === 'draft') return 'draft';
  if (publishAt && publishAt > now) return 'scheduled';
  if (expiresAt && expiresAt <= now) return 'expired';
  return announcement.status || 'draft';
};

const AnnouncementCard = ({ announcement, onDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const prefersReduced = useReducedMotion();

  const effectiveStatus = getEffectiveStatus(announcement);
  const isAuthor = user?.id === announcement.author_id;
  const isAdmin = user?.role === 'admin';
  const canModify = isAdmin || isAuthor;

  const handleEdit = () => {
    navigate(`/announcements/${announcement.id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      await api.delete(`/announcements/${announcement.id}`);
      if (onDelete) onDelete();
    } catch {
      setConfirming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.005 }}
      className="clay-card rounded-clay p-4 sm:p-6 transition-shadow hover:shadow-clay-hover"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-lg font-bold text-text-main">{announcement.title}</h3>
            <span className={`rounded-clay-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeStyles[announcement.type] || 'bg-text-muted/15 text-text-muted'}`}>
              {announcement.type}
            </span>
            <span className={`rounded-clay-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyles[effectiveStatus] || 'bg-text-muted/15 text-text-muted'}`}>
              {effectiveStatus}
            </span>
            {effectiveStatus === 'scheduled' && (
              <span className="flex items-center gap-1 rounded-clay-pill bg-warning/15 px-2.5 py-0.5 text-[10px] font-bold text-warning">
                <Clock size={10} /> Scheduled
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-text-muted break-words">{announcement.content}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
            <span>By {announcement.author_name || announcement.author?.full_name || 'Unknown'}</span>
            <span>{new Date(announcement.created_at).toLocaleString()}</span>
          </div>
        </div>
        {canModify && (
          <div className="flex flex-row gap-2 sm:flex-col sm:shrink-0">
            <motion.button
              type="button"
              onClick={handleEdit}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Pencil size={12} /> Edit
            </motion.button>
            <motion.button
              type="button"
              onClick={handleDelete}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3 py-1.5 text-xs font-semibold ${
                confirming ? 'bg-danger text-white' : 'bg-danger/15 text-danger'
              }`}
            >
              <Trash2 size={12} /> {confirming ? 'Confirm?' : 'Delete'}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AnnouncementCard;
