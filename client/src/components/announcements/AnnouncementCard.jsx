const typeStyles = {
  general: 'bg-indigo-100 text-indigo-800',
  class: 'bg-emerald-100 text-emerald-800',
};

const AnnouncementCard = ({ announcement }) => {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${typeStyles[announcement.type] || 'bg-slate-100 text-slate-700'}`}>
              {announcement.type}
            </span>
          </div>
          <p className="text-sm text-slate-700 mb-3">{announcement.content}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>By {announcement.author_name || announcement.author?.full_name || 'Unknown'}</span>
            <span>{new Date(announcement.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
