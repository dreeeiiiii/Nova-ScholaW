import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../../services/api.js';
import CreateAnnouncement from './Create.jsx';
import { ArrowLeft } from 'lucide-react';

const EditAnnouncement = ({ onSuccess, onCancel }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const prefersReduced = useReducedMotion();

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
      <div className="space-y-4 py-12">
        <div className="clay-card animate-clay-pulse rounded-clay p-6">
          <div className="h-5 w-48 rounded-clay-pill bg-primary/10" />
          <div className="mt-4 h-3 w-full rounded-clay-pill bg-primary/10" />
          <div className="mt-2 h-3 w-2/3 rounded-clay-pill bg-primary/10" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.4 }}
        className="clay-card rounded-clay p-6"
      >
        <p className="text-danger font-medium">{error}</p>
        <motion.button
          onClick={() => navigate('/announcements')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="clay-btn-sm mt-4 flex items-center gap-1.5 rounded-clay-pill bg-surface px-4 py-2 text-sm font-semibold text-text-main"
        >
          <ArrowLeft size={14} /> Back
        </motion.button>
      </motion.div>
    );
  }

  if (!announcement) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.4 }}
    >
      <CreateAnnouncement
        onSuccess={onSuccess}
        onCancel={onCancel}
        initialData={announcement}
      />
    </motion.div>
  );
};

export default EditAnnouncement;
