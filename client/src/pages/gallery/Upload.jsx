import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_MIMES = ['video/mp4'];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
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

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white">Upload Media</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="media-file" className="block text-sm font-medium text-slate-700">
                File *
              </label>
              <input
                ref={fileInputRef}
                id="media-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.mp4"
                onChange={handleFileChange}
                className="mt-1.5 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                JPG, PNG, or WebP up to 10 MB; MP4 up to 50 MB and 2 minutes.
              </p>
              {previewUrl && (
                <div className="relative mt-3">
                  {isVideo ? (
                    <video src={previewUrl} controls className="max-h-64 w-full rounded-lg bg-black" />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Selected file preview"
                      className="max-h-64 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="media-category" className="block text-sm font-medium text-slate-700">
                Category *
              </label>
              <select
                id="media-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="media-title" className="block text-sm font-medium text-slate-700">
                Title *
              </label>
              <input
                id="media-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Science fair 2026"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="media-description" className="block text-sm font-medium text-slate-700">
                Description <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="media-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a caption shown in the gallery…"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              />
            </div>

            {uploading && (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Uploading… {progress}%</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link
                to="/gallery/mine"
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                My Uploads
              </Link>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Submit for approval'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Upload;
