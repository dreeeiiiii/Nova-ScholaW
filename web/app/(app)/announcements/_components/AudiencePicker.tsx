"use client";

import { useEffect, useState, useCallback } from "react";

type Section = { id: number | string; name: string };
type Course = { id: number | string; name: string };
type Student = { id: number | string; full_name: string; email: string };

type Targets = { section_ids: (number | string)[]; course_ids: (number | string)[]; student_ids: (number | string)[] };

export default function AudiencePicker({
  value,
  onChange,
}: {
  value: Targets;
  onChange: (v: Targets) => void;
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);

  // Load sections/courses once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [secRes, couRes] = await Promise.all([fetch("/api/sections"), fetch("/api/courses")]);
        if (cancelled) return;
        if (secRes.ok) {
          const data = await secRes.json();
          setSections(data.sections ?? []);
        }
        if (couRes.ok) {
          const data = await couRes.json();
          setCourses(data.courses ?? []);
        }
      } catch {
        // silent
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const searchStudents = useCallback(
    async (q: string) => {
      if (!q || q.trim().length < 2) {
        setStudentResults([]);
        return;
      }
      setStudentLoading(true);
      try {
        const res = await fetch(`/api/users/students/search?q=${encodeURIComponent(q.trim())}&limit=20`);
        if (!res.ok) {
          setStudentResults([]);
          return;
        }
        const data = await res.json();
        const students: Student[] = data.students ?? [];
        // filter out already selected
        const filtered = students.filter((s) => !value.student_ids.includes(Number(s.id)) && !value.student_ids.includes(String(s.id) as never) && !value.student_ids.some((id) => String(id) === String(s.id)));
        setStudentResults(filtered);
      } catch {
        setStudentResults([]);
      } finally {
        setStudentLoading(false);
      }
    },
    [value.student_ids],
  );

  // debounced search
  useEffect(() => {
    const t = setTimeout(() => searchStudents(studentQuery), 300);
    return () => clearTimeout(t);
  }, [studentQuery, searchStudents]);

  function toggleSection(id: number | string) {
    const exists = value.section_ids.includes(id);
    const next = exists ? value.section_ids.filter((v) => String(v) !== String(id)) : [...value.section_ids, id];
    onChange({ ...value, section_ids: next });
  }

  function toggleCourse(id: number | string) {
    const exists = value.course_ids.includes(id);
    const next = exists ? value.course_ids.filter((v) => String(v) !== String(id)) : [...value.course_ids, id];
    onChange({ ...value, course_ids: next });
  }

  function addStudent(s: Student) {
    if (value.student_ids.some((id) => String(id) === String(s.id))) return;
    onChange({ ...value, student_ids: [...value.student_ids, s.id] });
    setStudentResults((prev) => prev.filter((x) => String(x.id) !== String(s.id)));
    setStudentQuery("");
  }

  function removeStudent(id: number | string) {
    onChange({ ...value, student_ids: value.student_ids.filter((v) => String(v) !== String(id)) });
  }

  const totalSelected = value.section_ids.length + value.course_ids.length + value.student_ids.length;

  return (
    <div className="space-y-4 rounded-2xl bg-primary/5 p-4">
      <h4 className="font-heading text-sm font-bold text-text-main">Target Audience</h4>

      <div>
        <p className="mb-2 text-sm font-semibold text-text-main">Sections</p>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-2xl bg-white p-2">
          {sections.map((s) => (
            <label key={String(s.id)} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1 hover:bg-primary/5">
              <input
                type="checkbox"
                checked={value.section_ids.map(String).includes(String(s.id))}
                onChange={() => toggleSection(s.id)}
                className="rounded border-primary/30 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-main">{s.name}</span>
            </label>
          ))}
          {sections.length === 0 && <p className="px-2 py-1 text-sm text-text-muted">No sections</p>}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-text-main">Courses</p>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-2xl bg-white p-2">
          {courses.map((c) => (
            <label key={String(c.id)} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1 hover:bg-primary/5">
              <input
                type="checkbox"
                checked={value.course_ids.map(String).includes(String(c.id))}
                onChange={() => toggleCourse(c.id)}
                className="rounded border-primary/30 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-main">{c.name}</span>
            </label>
          ))}
          {courses.length === 0 && <p className="px-2 py-1 text-sm text-text-muted">No courses</p>}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-text-main">Students</p>
        <input
          type="search"
          value={studentQuery}
          onChange={(e) => setStudentQuery(e.target.value)}
          placeholder="Search students by name or email…"
          className="clay-input w-full px-4 py-2.5 text-sm"
        />
        {studentLoading && <p className="mt-2 text-xs text-text-muted">Searching…</p>}
        {studentResults.length > 0 && (
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-2xl bg-white p-2">
            {studentResults.map((s) => (
              <div key={String(s.id)} className="flex items-center justify-between gap-2 px-2 py-1 hover:bg-primary/5">
                <span className="text-sm text-text-main">
                  {s.full_name} ({s.email})
                </span>
                <button
                  type="button"
                  onClick={() => addStudent(s)}
                  className="rounded-full bg-[#315c86] px-3 py-1 text-xs font-bold text-white"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {value.student_ids.map((id) => (
            <span key={String(id)} className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              Student {String(id)}
              <button type="button" onClick={() => removeStudent(id)} className="ml-1 hover:text-danger">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white px-4 py-3 text-sm">
        <span className="text-text-muted">Selected: {totalSelected} target{totalSelected === 1 ? "" : "s"}</span>
        {totalSelected === 0 && <span className="ml-2 font-bold text-danger">Warning: No targets selected</span>}
      </div>
    </div>
  );
}
