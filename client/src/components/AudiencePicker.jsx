import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const AudiencePicker = ({ onSelect, initialData = {} }) => {
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentOptions, setStudentOptions] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);

  const [selectedSectionIds, setSelectedSectionIds] = useState(initialData.section_ids || []);
  const [selectedCourseIds, setSelectedCourseIds] = useState(initialData.course_ids || []);
  const [selectedStudents, setSelectedStudents] = useState(
    initialData.student_ids?.map((id) => ({ id, name: '' })) || []
  );

  const loadReferenceData = useCallback(async () => {
    try {
      const [secRes, couRes] = await Promise.all([
        api.get('/sections'),
        api.get('/courses'),
      ]);
      setSections(secRes.data.sections || []);
      setCourses(couRes.data.courses || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const searchStudents = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setStudentOptions([]);
      return;
    }
    try {
      const res = await api.get('/users', { params: { role: 'student', search: query } });
      const users = res.data.users || [];
      const filtered = users.filter(
        (u) => !selectedStudents.find((s) => s.id === u.id)
      );
      setStudentOptions(filtered);
    } catch {
      setStudentOptions([]);
    }
  }, [selectedStudents]);

  const handleStudentSearch = (e) => {
    const value = e.target.value;
    setStudentSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => searchStudents(value), 300);
    setSearchTimer(timer);
  };

  const addStudent = (student) => {
    if (!selectedStudents.find((s) => s.id === student.id)) {
      const newStudents = [...selectedStudents, { id: student.id, name: student.full_name }];
      setSelectedStudents(newStudents);
      setStudentOptions(studentOptions.filter((s) => s.id !== student.id));
      setStudentSearch('');
    }
  };

  const removeStudent = (id) => {
    const removed = selectedStudents.find((s) => s.id === id);
    setSelectedStudents(selectedStudents.filter((s) => s.id !== id));
    if (removed) {
      setStudentOptions((prev) => [...prev, { id: removed.id, full_name: removed.name, email: '' }]);
    }
  };

  const toggleSection = (id) => {
    setSelectedSectionIds(
      selectedSectionIds.includes(id)
        ? selectedSectionIds.filter((sid) => sid !== id)
        : [...selectedSectionIds, id]
    );
  };

  const toggleCourse = (id) => {
    setSelectedCourseIds(
      selectedCourseIds.includes(id)
        ? selectedCourseIds.filter((cid) => cid !== id)
        : [...selectedCourseIds, id]
    );
  };

  const emitSelection = useCallback(() => {
    onSelect({
      section_ids: selectedSectionIds,
      course_ids: selectedCourseIds,
      student_ids: selectedStudents.map((s) => s.id),
    });
  }, [selectedSectionIds, selectedCourseIds, selectedStudents, onSelect]);

  useEffect(() => {
    emitSelection();
  }, [emitSelection]);

  const totalSelected = selectedSectionIds.length + selectedCourseIds.length + selectedStudents.length;

  return (
    <div className="space-y-4 rounded-lg border border-slate-300 bg-white p-3 sm:p-4">
      <h4 className="font-semibold text-slate-800">Target Audience</h4>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Sections</label>
        <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {sections.map((s) => (
            <label key={s.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSectionIds.includes(s.id)}
                onChange={() => toggleSection(s.id)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700 break-words">{s.name}</span>
            </label>
          ))}
          {sections.length === 0 && (
            <p className="px-2 py-1 text-sm text-slate-400">No sections available.</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Courses</label>
        <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCourseIds.includes(c.id)}
                onChange={() => toggleCourse(c.id)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700 break-words">{c.name}</span>
            </label>
          ))}
          {courses.length === 0 && (
            <p className="px-2 py-1 text-sm text-slate-400">No courses available.</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Students</label>
        <div className="space-y-2">
          <div className="relative">
            <input
              type="search"
              value={studentSearch}
              onChange={handleStudentSearch}
              placeholder="Search students by name or email…"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
          {studentOptions.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {studentOptions.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 px-2 py-1 hover:bg-slate-50 rounded sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-700 break-words">{s.full_name} ({s.email})</span>
                  <button
                    type="button"
                    onClick={() => addStudent(s)}
                    className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {selectedStudents.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">
                {s.name || `Student ${s.id}`}
                <button type="button" onClick={() => removeStudent(s.id)} className="ml-1 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-600">
          Selected: {totalSelected} target{totalSelected !== 1 ? 's' : ''}
        </span>
        {totalSelected === 0 && (
          <span className="ml-2 text-red-600 font-medium">Warning: No targets selected</span>
        )}
      </div>
    </div>
  );
};

export default AudiencePicker;
