import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

// Creating a course happens in a sheet over the list, like joining one in the
// world: /manage?buat opens it. /manage/courses/new is the old address of the same
// thing and redirects here, so every link that already exists keeps working.

export const NEW_COURSE_PARAM = "buat";
export const NEW_COURSE_URL = `/manage?${NEW_COURSE_PARAM}`;

// Marks a sheet opened from inside the list, so closing it steps back and the Back
// button and the close button do the same thing.
export const OPENED_HERE = { newCourseSheet: true };

export function useNewCourseSheet() {
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const openedHere = (location.state as typeof OPENED_HERE | null)?.newCourseSheet === true;
  const close = useCallback(
    () => (openedHere ? navigate(-1) : navigate("/manage", { replace: true, preventScrollReset: true })),
    [navigate, openedHere],
  );
  return { open: search.has(NEW_COURSE_PARAM), close };
}
