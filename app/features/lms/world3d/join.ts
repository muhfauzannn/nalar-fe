import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

// Joining a course happens in the world, not on a page of its own: /dunia?gabung
// opens a sheet over the canvas, and /dunia?gabung=K7M2-QX9P opens it with the
// class code filled in (the invite link a teacher shares lands here in 3D).

export const JOIN_PARAM = "gabung";

/** The sheet a /dunia URL asks for, or null while it is closed. */
export function joinSheetOf(search: URLSearchParams) {
  const code = search.get(JOIN_PARAM);
  return code === null ? null : { code: code.trim().slice(0, 32) };
}

export function joinUrl(code?: string | null) {
  return `/dunia?${new URLSearchParams({ [JOIN_PARAM]: code?.trim() ?? "" })}`;
}

// Marks a sheet opened from inside the world, so closing it steps back and the
// Back button and the close button do the same thing.
const OPENED_HERE = { joinSheet: true };

export function useOpenJoinSheet() {
  const navigate = useNavigate();
  return useCallback((code?: string) => navigate(joinUrl(code), { state: OPENED_HERE }), [navigate]);
}

export function useJoinSheet() {
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const open = useOpenJoinSheet();
  const openedHere = (location.state as typeof OPENED_HERE | null)?.joinSheet === true;
  const close = useCallback(
    () => (openedHere ? navigate(-1) : navigate("/dunia", { replace: true, preventScrollReset: true })),
    [navigate, openedHere],
  );
  return { sheet: joinSheetOf(search), open, close };
}
