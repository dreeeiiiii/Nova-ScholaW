import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AudiencePicker from '../../components/AudiencePicker.jsx';

const CreateAnnouncement = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [imageUrl, setImageUrl] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [targets, setTargets] = useState({ section_ids: [], course_ids: [], student_ids: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTargets, setShowTargets] = useState(false);

  const isClass = type === 'class';

  useEffect(() => {
    setShowTargets(isClass);
    if (!isClass) {
      setTargets({ section_ids: [], course_ids: [], student_ids: [] });
    }
  }, [type]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    if (title.trim() === '' || content.trim() === '') {
      setError('Title and content are required.');
      setSaving(false);
      return;
    }

    if (isClass && targets.section_ids.length === 0 && targets.course_ids.length === 0 && targets.student_ids.length === 0) {
      setError('Class announcement must have at least one target.');
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      type,
      image_url: imageUrl.trim() || undefined,
      publish_at: publishAt || undefined,
      expires_at: expiresAt || undefined,
    };

    if (isClass) {
      payload.section_ids = targets.section_ids;
      payload.course_ids = targets.course_ids;
      payload.student_ids = targets.student_ids;
    }

    try {
      const endpoint = type === 'general' ? '/api/announcements/general' : '/api/announcements/class';
      const res = await api.post(endpoint, payload);
      onSuccess();
      navigate('/announcements');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-200">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Create Announcement</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="ann-title" className="block text-sm font-medium text-slate-700">
            Title *
          </label>
          <input
            id="ann-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="ann-content" className="block text-sm font-medium text-slate-700">
            Content *
          </label>
          <textarea
            id="ann-content"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Announcement content"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
          <div className="flex gap-4">
            {['general', 'class'].map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={(e) => setType(e.target.value)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ann-image" className="block text-sm font-medium text-slate-700">
            Image URL (optional)
          </label>
          <input
            id="ann-image"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-publish" className="block text-sm font-medium text-slate-700">
              Publish at (optional)
            </label>
            <input
              id="ann-publish"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="ann-expires" className="block text-sm font-medium text-slate-700">
              Expires at (optional)
            </label>
            <input
              id="ann-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
        </div>

        {showTargets && (
          <AudiencePicker onSelect={setTargets} />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : `Create ${type} Announcement`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAnnouncement;
