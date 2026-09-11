import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, LayoutGroup } from 'framer-motion';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AudiencePicker from '../../components/AudiencePicker.jsx';
import { X } from 'lucide-react';

const CreateAnnouncement = ({ onSuccess, onCancel, initialData }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const prefersReduced = useReducedMotion();
  const handleSuccess = onSuccess || (() => navigate('/announcements'));
  const handleCancel = onCancel || (() => navigate('/announcements'));

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
      handleSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create announcement.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'clay-input block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted';

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="clay-card rounded-clay p-6"
    >
      <motion.h2 variants={item} className="mb-4 font-heading text-lg font-bold text-text-main">
        {initialData ? 'Edit Announcement' : 'Create Announcement'}
      </motion.h2>

      {error && (
        <motion.div variants={item} className="mb-4 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <motion.div variants={item}>
          <label htmlFor="ann-title" className="block text-sm font-semibold text-text-main">Title *</label>
          <input id="ann-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className={`${inputCls} mt-1.5`} />
        </motion.div>

        <motion.div variants={item}>
          <label htmlFor="ann-content" className="block text-sm font-semibold text-text-main">Content *</label>
          <textarea id="ann-content" required rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Announcement content" className={`${inputCls} mt-1.5`} />
        </motion.div>

        <motion.div variants={item}>
          <label className="block text-sm font-semibold text-text-main mb-2">Type</label>
          <LayoutGroup>
            <div className="flex flex-wrap gap-3">
              {['general', 'class'].map((t) => (
                <motion.button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative rounded-clay-pill px-5 py-2.5 text-sm font-bold transition-colors ${
                    type === t
                      ? 'bg-primary text-white shadow-clay-sm'
                      : 'bg-surface text-text-muted hover:text-primary'
                  }`}
                >
                  {t === 'general' ? 'General' : 'Class'}
                </motion.button>
              ))}
            </div>
          </LayoutGroup>
        </motion.div>

        <motion.div variants={item}>
          <label className="block text-sm font-semibold text-text-main mb-2">Image</label>
          <input
            ref={fileInputRef}
            id="ann-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="block w-full text-sm text-text-muted file:mr-4 file:rounded-clay-pill file:border-0 file:bg-primary/15 file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary hover:file:bg-primary/25"
          />
          <p className="mt-1 text-xs text-text-muted">JPEG, PNG, or WebP. Max 10 MB.</p>
          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="Preview" className="h-48 rounded-clay object-cover" />
              <motion.button
                type="button"
                onClick={handleRemoveImage}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white"
              >
                <X size={14} />
              </motion.button>
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-publish" className="block text-sm font-semibold text-text-main">Publish at (optional)</label>
            <input id="ann-publish" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className={`${inputCls} mt-1.5`} />
            <p className="mt-1 text-xs text-text-muted">Leave empty to publish immediately</p>
          </div>
          <div>
            <label htmlFor="ann-expires" className="block text-sm font-semibold text-text-main">Expires at (optional)</label>
            <input id="ann-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={`${inputCls} mt-1.5`} />
          </div>
        </motion.div>

        {showTargets && (
          <motion.div variants={item}>
            <AudiencePicker onSelect={setTargets} initialData={targets} />
          </motion.div>
        )}

        <motion.div variants={item} className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <motion.button
            type="button"
            onClick={handleCancel}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2.5 text-sm font-semibold text-text-main"
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            disabled={saving}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="clay-btn rounded-clay-pill bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-clay disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </span>
            ) : (
              initialData ? 'Update' : `Create ${type} Announcement`
            )}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default CreateAnnouncement;
