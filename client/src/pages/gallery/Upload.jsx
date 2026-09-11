import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../../services/api.js';
import { ArrowLeft, Upload as UploadIcon, X, FolderOpen, Image, Film } from 'lucide-react';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_MIMES = ['video/mp4'];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const prefersReduced = useReducedMotion();

  const [categories, setCategories] = useState([]);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/categories')
      .then((res) => {
        if (active) setCategories(res.data.categories || []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load categories.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const precheckFile = (f) => {
    if (![...IMAGE_MIMES, ...VIDEO_MIMES].includes(f.type)) {
      return 'Invalid file type. Only JPG, PNG, WebP images and MP4 videos are allowed.';
    }
    if (IMAGE_MIMES.includes(f.type) && f.size > IMAGE_MAX_BYTES) {
      return 'Image too large. Maximum size is 10 MB.';
    }
    if (VIDEO_MIMES.includes(f.type) && f.size > VIDEO_MAX_BYTES) {
      return 'Video too large. Maximum size is 50 MB.';
    }
    return '';
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setError('');
    setSuccess('');
    if (!f) {
      setFile(null);
      setPreviewUrl('');
      return;
    }
    const problem = precheckFile(f);
    if (problem) {
      setError(problem);
      setFile(null);
      setPreviewUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setIsVideo(VIDEO_MIMES.includes(f.type));
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      const problem = precheckFile(f);
      if (problem) {
        setError(problem);
        return;
      }
      setError('');
      setSuccess('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setIsVideo(VIDEO_MIMES.includes(f.type));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }
    const problem = precheckFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category_id', categoryId);
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());

      await api.post('/gallery/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });

      setSuccess('Submitted for admin approval.');
      setTimeout(() => navigate('/gallery/mine', { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
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
    <div className="min-h-screen bg-base font-body text-text-main">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/dashboard"
            className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3 py-2 text-xs font-semibold text-text-muted"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="font-heading text-xl font-bold text-text-main">Upload Media</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="clay-card rounded-clay p-4 sm:p-6"
        >
          {error && (
            <motion.div variants={item} className="mb-4 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div variants={item} className="mb-4 rounded-clay bg-success/15 px-4 py-3 text-sm font-medium text-success">
              {success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <motion.div variants={item}>
              <label htmlFor="media-file" className="block text-sm font-semibold text-text-main">File *</label>
              <input
                ref={fileInputRef}
                id="media-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.mp4"
                onChange={handleFileChange}
                className="mt-1.5 block w-full text-sm text-text-muted file:mr-4 file:rounded-clay-pill file:border-0 file:bg-primary/15 file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary hover:file:bg-primary/25"
              />
              <p className="mt-1 text-xs text-text-muted">
                JPG, PNG, or WebP up to 10 MB; MP4 up to 50 MB and 2 minutes.
              </p>
              {!file && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`mt-3 flex flex-col items-center justify-center rounded-clay border-2 border-dashed p-8 text-center transition-colors ${
                    dragOver
                      ? 'border-primary bg-primary/10'
                      : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <UploadIcon size={32} className={`mb-2 ${dragOver ? 'text-primary' : 'text-primary/40'}`} />
                  <p className="text-sm font-semibold text-text-main">Drag and drop a file here</p>
                  <p className="mt-1 text-xs text-text-muted">or click the button above</p>
                </div>
              )}
              {previewUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={prefersReduced ? { duration: 0 } : { duration: 0.3 }}
                  className="relative mt-3"
                >
                  {isVideo ? (
                    <video src={previewUrl} controls className="max-h-64 w-full rounded-clay bg-text-main" />
                  ) : (
                    <img src={previewUrl} alt="Selected file preview" className="max-h-64 w-full rounded-clay object-contain bg-primary/5" />
                  )}
                  <motion.button
                    type="button"
                    onClick={handleRemoveFile}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white"
                  >
                    <X size={14} />
                  </motion.button>
                </motion.div>
              )}
            </motion.div>

            <motion.div variants={item}>
              <label htmlFor="media-category" className="block text-sm font-semibold text-text-main">Category *</label>
              <select
                id="media-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`${inputCls} mt-1.5`}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </motion.div>

            <motion.div variants={item}>
              <label htmlFor="media-title" className="block text-sm font-semibold text-text-main">Title *</label>
              <input
                id="media-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Science fair 2026"
                className={`${inputCls} mt-1.5`}
              />
            </motion.div>

            <motion.div variants={item}>
              <label htmlFor="media-description" className="block text-sm font-semibold text-text-main">
                Description <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <textarea
                id="media-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a caption shown in the gallery…"
                className={`${inputCls} mt-1.5`}
              />
            </motion.div>

            {uploading && (
              <motion.div variants={item}>
                <div className="h-2 overflow-hidden rounded-clay-pill bg-primary/15">
                  <motion.div
                    className="h-full rounded-clay-pill bg-primary"
                    animate={{ width: `${progress}%` }}
                    transition={prefersReduced ? { duration: 0 } : { duration: 0.3 }}
                  />
                </div>
                <p className="mt-1 text-xs text-text-muted">Uploading… {progress}%</p>
              </motion.div>
            )}

            <motion.div variants={item} className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link
                to="/gallery/mine"
                className="clay-btn-sm flex items-center justify-center gap-1.5 rounded-clay-pill bg-surface px-4 py-2.5 text-sm font-semibold text-text-main hover:shadow-clay-hover"
              >
                <FolderOpen size={14} /> My Uploads
              </Link>
              <motion.button
                type="submit"
                disabled={uploading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="clay-btn flex items-center gap-2 rounded-clay-pill bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-clay disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadIcon size={14} />
                    Submit for approval
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default Upload;
