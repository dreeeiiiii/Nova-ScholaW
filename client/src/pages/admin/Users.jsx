import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ArrowLeft, Plus, X, Users as UsersIcon, LogOut } from 'lucide-react';

const ROLE_STYLES = {
  admin: 'bg-primary/15 text-primary',
  teacher: 'bg-secondary/15 text-secondary',
  student: 'bg-success/15 text-success',
};

const EMPTY_FORM = {
  email: '',
  password: '',
  full_name: '',
  role: 'student',
  section_id: '',
  course_id: '',
};

const Users = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [modal, setModal] = useState({ open: false, mode: 'create', user: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [secRes, couRes] = await Promise.all([api.get('/sections'), api.get('/courses')]);
      setSections(secRes.data.sections || []);
      setCourses(couRes.data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sections and courses.');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/users', { params });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, debouncedSearch]);

  useEffect(() => { loadReferenceData(); }, [loadReferenceData]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: 'create', user: null });
    setError('');
  };

  const openEdit = (target) => {
    setForm({
      email: target.email,
      password: '',
      full_name: target.full_name,
      role: target.role,
      section_id: target.section_id ?? '',
      course_id: target.course_id ?? '',
    });
    setModal({ open: true, mode: 'edit', user: target });
    setError('');
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'create', user: null });
    setError('');
  };

  const handleField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const isStudent = form.role === 'student';
    const payload = {
      email: form.email,
      full_name: form.full_name,
      role: form.role,
      section_id: isStudent && form.section_id ? Number(form.section_id) : null,
      course_id: isStudent && form.course_id ? Number(form.course_id) : null,
    };
    if (modal.mode === 'create') payload.password = form.password;

    try {
      if (modal.mode === 'create') {
        await api.post('/users', payload);
        showNotice('User created.');
      } else {
        await api.put(`/users/${modal.user.id}`, payload);
        showNotice('User updated.');
      }
      closeModal();
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (target) => {
    setError('');
    try {
      if (target.is_active) {
        await api.patch(`/users/${target.id}/deactivate`);
        showNotice(`${target.full_name} deactivated.`);
      } else {
        await api.patch(`/users/${target.id}/activate`);
        showNotice(`${target.full_name} activated.`);
      }
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const roleBadge = (role) => (
    <span className={`inline-block rounded-clay-pill px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${ROLE_STYLES[role] || 'bg-text-muted/15 text-text-muted'}`}>
      {role}
    </span>
  );

  const statusBadge = (isActive) => (
    <span className={`inline-flex items-center gap-1.5 rounded-clay-pill px-3 py-1 text-[10px] font-bold ${isActive ? 'bg-success/15 text-success' : 'bg-text-muted/15 text-text-muted'}`}>
      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-success' : 'bg-text-muted'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const canToggle = (target) => !(target.id === user?.id);
  const filteredCount = useMemo(() => users.length, [users]);

  const inputCls = 'clay-input block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted disabled:bg-primary/5 disabled:text-text-muted';

  return (
    <div className="min-h-screen bg-base font-body text-text-main">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill px-3 py-2 text-xs font-semibold text-text-muted"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
            <h1 className="font-heading text-xl font-bold text-text-main">User Management</h1>
          </div>
          <motion.button
            type="button"
            onClick={logout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="clay-btn-sm flex items-center gap-1.5 rounded-clay-pill bg-surface px-4 py-2 text-xs font-semibold text-text-main hover:shadow-clay-hover"
          >
            <LogOut size={14} /> Log out
          </motion.button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </motion.div>
          )}
          {notice && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 rounded-clay bg-success/15 px-4 py-3 text-sm font-medium text-success">
              {notice}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="clay-card mb-6 flex flex-col gap-4 rounded-clay p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="clay-input w-full px-4 py-2.5 text-sm sm:w-64"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="clay-input bg-base px-4 py-2.5 text-sm text-text-main"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <motion.button
            type="button"
            onClick={openCreate}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="clay-btn flex items-center gap-1.5 rounded-clay-pill bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-clay"
          >
            <Plus size={14} /> Create User
          </motion.button>
        </div>

        <div className="clay-card overflow-hidden rounded-clay">
          <div className="border-b border-primary/10 px-5 py-3 text-xs font-semibold text-text-muted">
            {loading
              ? 'Loading users…'
              : `${total} user${total === 1 ? '' : 's'} found${roleFilter || debouncedSearch ? ' (filtered)' : ''}`}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary/10">
              <thead>
                <tr>
                  {['Email', 'Full Name', 'Role', 'Section', 'Course', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {!loading && filteredCount === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-text-muted">
                      No users match your filters. Try a different search or role.
                    </td>
                  </tr>
                )}
                {users.map((u, idx) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={prefersReduced ? { duration: 0 } : { delay: Math.min(idx * 0.03, 0.3), duration: 0.3 }}
                    className={`transition-colors hover:bg-primary/5 ${!u.is_active ? 'opacity-50' : ''}`}
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-text-muted">{u.email}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-text-main">
                      {u.full_name}
                      {u.id === user?.id && (
                        <span className="ml-2 text-xs font-normal text-primary">(you)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">{roleBadge(u.role)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-text-muted">{u.section_name || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-text-muted">{u.course_name || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4">{statusBadge(u.is_active)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        <motion.button
                          type="button"
                          onClick={() => openEdit(u)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="clay-btn-sm rounded-clay-pill bg-primary/15 px-3 py-1.5 text-[10px] font-semibold text-primary"
                        >
                          Edit
                        </motion.button>
                        {canToggle(u) ? (
                          u.is_active ? (
                            <motion.button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="clay-btn-sm rounded-clay-pill bg-danger/15 px-3 py-1.5 text-[10px] font-semibold text-danger"
                            >
                              Deactivate
                            </motion.button>
                          ) : (
                            <motion.button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="clay-btn-sm rounded-clay-pill bg-success/15 px-3 py-1.5 text-[10px] font-semibold text-success"
                            >
                              Activate
                            </motion.button>
                          )
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
              className="clay-card w-full max-w-lg rounded-clay p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-text-main">
                  {modal.mode === 'create' ? 'Create User' : `Edit ${modal.user.full_name}`}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="clay-btn-sm flex h-8 w-8 items-center justify-center rounded-clay-pill bg-surface text-text-muted"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {modal.mode === 'edit' && (
                <p className="mb-5 rounded-clay bg-primary/5 px-4 py-2.5 text-xs text-text-muted">
                  Email and password cannot be changed here. Use the field below only to update profile, role, section, and course assignment.
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="u-email" className="block text-sm font-semibold text-text-main">Email</label>
                  <input id="u-email" name="email" type="email" required disabled={modal.mode === 'edit'} value={form.email} onChange={handleField} placeholder="name@my.nst.edu.ph" className={`${inputCls} mt-1.5`} />
                </div>

                {modal.mode === 'create' && (
                  <div>
                    <label htmlFor="u-password" className="block text-sm font-semibold text-text-main">Password</label>
                    <input id="u-password" name="password" type="password" required minLength={8} value={form.password} onChange={handleField} placeholder="At least 8 characters" className={`${inputCls} mt-1.5`} />
                  </div>
                )}

                <div>
                  <label htmlFor="u-name" className="block text-sm font-semibold text-text-main">Full name</label>
                  <input id="u-name" name="full_name" required value={form.full_name} onChange={handleField} className={`${inputCls} mt-1.5`} />
                </div>

                <div>
                  <label htmlFor="u-role" className="block text-sm font-semibold text-text-main">Role</label>
                  <select id="u-role" name="role" value={form.role} onChange={handleField} className={`${inputCls} mt-1.5`}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {form.role === 'student' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="u-section" className="block text-sm font-semibold text-text-main">Section</label>
                      <select id="u-section" name="section_id" value={form.section_id} onChange={handleField} className={`${inputCls} mt-1.5`}>
                        <option value="">— None —</option>
                        {sections.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="u-course" className="block text-sm font-semibold text-text-main">Course</label>
                      <select id="u-course" name="course_id" value={form.course_id} onChange={handleField} className={`${inputCls} mt-1.5`}>
                        <option value="">— None —</option>
                        {courses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-clay bg-danger/15 px-4 py-3 text-sm font-medium text-danger">{error}</div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <motion.button type="button" onClick={closeModal} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2.5 text-sm font-semibold text-text-main">
                    Cancel
                  </motion.button>
                  <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="clay-btn rounded-clay-pill bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-clay disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? 'Saving…' : modal.mode === 'create' ? 'Create user' : 'Save changes'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
