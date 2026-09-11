import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const typeStyles = {
  general: 'bg-indigo-100 text-indigo-800',
  class: 'bg-emerald-100 text-emerald-800',
};

const statusStyles = {
  published: 'bg-green-100 text-green-800',
  scheduled: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
  draft: 'bg-slate-100 text-slate-800',
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
    <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${typeStyles[announcement.type] || 'bg-slate-100 text-slate-700'}`}>
              {announcement.type}
            </span>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusStyles[effectiveStatus] || 'bg-slate-100 text-slate-700'}`}>
              {effectiveStatus}
            </span>
            {effectiveStatus === 'scheduled' && (
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                ⏰ Scheduled
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 mb-3 break-words">{announcement.content}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>By {announcement.author_name || announcement.author?.full_name || 'Unknown'}</span>
            <span>{new Date(announcement.created_at).toLocaleString()}</span>
          </div>
        </div>
        {canModify && (
          <div className="flex flex-row gap-2 sm:flex-col sm:shrink-0">
            <button
              type="button"
              onClick={handleEdit}
              className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                confirming ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {confirming ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCard;
