import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import CreateAnnouncement from './Create.jsx';

const EditAnnouncement = ({ onSuccess, onCancel }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await api.get(`/announcements/${id}`);
        const { announcement: a, targets: targetData } = res.data;
        const targetsPayload = {
          section_ids: targetData.filter((t) => t.target_type === 'section').map((t) => t.section_id),
          course_ids: targetData.filter((t) => t.target_type === 'course').map((t) => t.course_id),
          student_ids: targetData.filter((t) => t.target_type === 'student').map((t) => t.student_id),
        };
        setAnnouncement({ ...a, targets: targetsPayload });
        setLoading(false);
      } catch {
        setError('Failed to load announcement.');
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-lg border border-red-200">
        <p className="text-red-700">{error}</p>
        <button onClick={() => navigate('/announcements')} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm">Back</button>
      </div>
    );
  }

  if (!announcement) return null;

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-200">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Edit Announcement</h2>
      <CreateAnnouncement
        onSuccess={onSuccess}
        onCancel={onCancel}
        initialData={announcement}
      />
    </div>
  );
};

export default EditAnnouncement;
