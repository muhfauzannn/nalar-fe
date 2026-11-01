import { useRouteLoaderData } from "react-router";

import type { StudentShellData } from "../types";

/** The signed-in student's id, from the app layout's loader. */
export function useStudentId() {
  return useRouteLoaderData<StudentShellData>("routes/_app")?.user.id ?? null;
}
