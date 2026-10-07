-- Enforce new/changed explicit assignments without inventing or rewriting legacy membership.
CREATE FUNCTION enforce_user_department_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assigned_department BIGINT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role
    AND NEW.department_id IS NOT DISTINCT FROM OLD.department_id
    AND NEW.section_id IS NOT DISTINCT FROM OLD.section_id
    AND NEW.course_id IS NOT DISTINCT FROM OLD.course_id THEN RETURN NEW; END IF;
  IF NEW.role = 'admin' AND (NEW.department_id IS NOT NULL OR NEW.section_id IS NOT NULL OR NEW.course_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Administrator has no academic assignment' USING ERRCODE = '23514';
  END IF;
  IF NEW.role <> 'student' AND (NEW.section_id IS NOT NULL OR NEW.course_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Only Students have class or section assignments' USING ERRCODE = '23514';
  END IF;
  -- NULL preserves historical users pending explicit Administrator review.
  IF NEW.department_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.section_id IS NOT NULL THEN
    SELECT department_id INTO assigned_department FROM sections WHERE id = NEW.section_id FOR SHARE;
    IF assigned_department IS DISTINCT FROM NEW.department_id THEN
      RAISE EXCEPTION 'Section must belong to the user department' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.course_id IS NOT NULL THEN
    SELECT department_id INTO assigned_department FROM courses WHERE id = NEW.course_id FOR SHARE;
    IF assigned_department IS DISTINCT FROM NEW.department_id THEN
      RAISE EXCEPTION 'Class must belong to the user department' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER users_department_membership BEFORE INSERT OR UPDATE OF role,department_id,section_id,course_id
  ON users FOR EACH ROW EXECUTE FUNCTION enforce_user_department_membership();

CREATE FUNCTION protect_academic_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE has_reference BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'sections' THEN
      SELECT EXISTS(SELECT 1 FROM users WHERE section_id = OLD.id)
        OR EXISTS(SELECT 1 FROM announcement_targets WHERE section_id = OLD.id) INTO has_reference;
    ELSE
      SELECT EXISTS(SELECT 1 FROM users WHERE course_id = OLD.id)
        OR EXISTS(SELECT 1 FROM announcement_targets WHERE course_id = OLD.id) INTO has_reference;
    END IF;
    IF has_reference THEN RAISE EXCEPTION 'Assigned or historically targeted academic records cannot be deleted' USING ERRCODE = '23514'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.department_id IS NOT DISTINCT FROM OLD.department_id THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'sections' THEN
    SELECT EXISTS(SELECT 1 FROM users WHERE section_id = OLD.id AND department_id IS NOT NULL
      AND department_id IS DISTINCT FROM NEW.department_id) INTO has_reference;
  ELSE
    SELECT EXISTS(SELECT 1 FROM users WHERE course_id = OLD.id AND department_id IS NOT NULL
      AND department_id IS DISTINCT FROM NEW.department_id) INTO has_reference;
  END IF;
  IF has_reference THEN RAISE EXCEPTION 'Resolve explicit user assignments before moving academic records' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sections_department_history BEFORE UPDATE OF department_id OR DELETE
  ON sections FOR EACH ROW EXECUTE FUNCTION protect_academic_history();
CREATE TRIGGER courses_department_history BEFORE UPDATE OF department_id OR DELETE
  ON courses FOR EACH ROW EXECUTE FUNCTION protect_academic_history();
