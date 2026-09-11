import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AudiencePicker from '../../components/AudiencePicker.jsx';

const CreateAnnouncement = ({ onSuccess, onCancel, initialData }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [type, setType] = useState(initialData?.type || 'general');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData?.image_url || '');
  const [publishAt, setPublishAt] = useState(initialData?.publish_at ? new Date(initialData.publish_at).toISOString().slice(0, 16) : '');
  const [expiresAt, setExpiresAt] = useState(initialData?.expires_at ? new Date(initialData.expires_at).toISOString().slice(0, 16) : '');
  const [targets, setTargets] = useState(initialData?.targets || { section_ids: [], course_ids: [], student_ids: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTargets, setShowTargets] = useState(true);

  const isClass = type === 'class';

  useEffect(() => {
    setShowTargets(isClass);
    if (!isClass) {
      setTargets({ section_ids: [], course_ids: [], student_ids: [] });
    }
  }, [type]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

    try {
      let imageUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const res = await api.post('/announcements/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = res.data.image_url;
      }

      const payload = {
        title: title.trim(),
        content: content.trim(),
        type,
        image_url: imageUrl || undefined,
        publish_at: publishAt || undefined,
        expires_at: expiresAt || undefined,
      };

      if (isClass) {
        payload.section_ids = targets.section_ids;
        payload.course_ids = targets.course_ids;
        payload.student_ids = targets.student_ids;
      }

      if (initialData) {
        await api.put(`/announcements/${initialData.id}`, payload);
      } else {
        const endpoint = type === 'general' ? '/announcements/general' : '/announcements/class';
        await api.post(endpoint, payload);
      }
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
      <h2 className="mb-4 text-lg font-bold text-slate-900">
        {initialData ? 'Edit Announcement' : 'Create Announcement'}
      </h2>

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
          <label className="block text-sm font-medium text-slate-700 mb-2">Image</label>
          <input
            ref={fileInputRef}
            id="ann-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <p className="mt-1 text-xs text-slate-400">JPEG, PNG, or WebP. Max 10 MB.</p>
          {imagePreview && (
            <div className="mt-2 relative">
              <img src={imagePreview} alt="Preview" className="h-48 object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}
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
            <p className="mt-1 text-xs text-slate-400">Leave empty to publish immediately</p>
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
          <AudiencePicker onSelect={setTargets} initialData={targets} />
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
            {saving ? 'Saving…' : (initialData ? 'Update' : `Create ${type} Announcement`)}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAnnouncement;
