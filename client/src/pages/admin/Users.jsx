import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-800',
  teacher: 'bg-blue-100 text-blue-800',
  student: 'bg-green-100 text-green-800',
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
      const [secRes, couRes] = await Promise.all([
        api.get('/sections'),
        api.get('/courses'),
      ]);
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

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
        ROLE_STYLES[role] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {role}
    </span>
  );

  const statusBadge = (isActive) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const canToggle = (target) => !(target.id === user?.id);

  const filteredCount = useMemo(() => users.length, [users]);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm font-medium text-slate-400 hover:text-white"
            >
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold text-white">User Management</h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none sm:w-64"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            + Create User
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3 text-sm text-slate-500">
            {loading
              ? 'Loading users…'
              : `${total} user${total === 1 ? '' : 's'} found${roleFilter || debouncedSearch ? ' (filtered)' : ''}`}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Email', 'Full Name', 'Role', 'Section', 'Course', 'Status', 'Actions'].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && filteredCount === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                      No users match your filters. Try a different search or role.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">{u.email}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-900">
                      {u.full_name}
                      {u.id === user?.id && (
                        <span className="ml-2 text-xs font-normal text-indigo-500">(you)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">{roleBadge(u.role)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {u.section_name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {u.course_name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">{statusBadge(u.is_active)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        {canToggle(u) ? (
                          u.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                            >
                              Activate
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {modal.mode === 'create' ? 'Create User' : `Edit ${modal.user.full_name}`}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modal.mode === 'edit' && (
              <p className="mb-5 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                Email and password cannot be changed here. Use the field below only to update
                profile, role, section, and course assignment.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="u-email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="u-email"
                  name="email"
                  type="email"
                  required
                  disabled={modal.mode === 'edit'}
                  value={form.email}
                  onChange={handleField}
                  placeholder="name@my.nst.edu.ph"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {modal.mode === 'create' && (
                <div>
                  <label htmlFor="u-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="u-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={handleField}
                    placeholder="At least 8 characters"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="u-name" className="block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  id="u-name"
                  name="full_name"
                  required
                  value={form.full_name}
                  onChange={handleField}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="u-role" className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  id="u-role"
                  name="role"
                  value={form.role}
                  onChange={handleField}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {form.role === 'student' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="u-section" className="block text-sm font-medium text-slate-700">
                      Section
                    </label>
                    <select
                      id="u-section"
                      name="section_id"
                      value={form.section_id}
                      onChange={handleField}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                    >
                      <option value="">— None —</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="u-course" className="block text-sm font-medium text-slate-700">
                      Course
                    </label>
                    <select
                      id="u-course"
                      name="course_id"
                      value={form.course_id}
                      onChange={handleField}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                    >
                      <option value="">— None —</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : modal.mode === 'create' ? 'Create user' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;