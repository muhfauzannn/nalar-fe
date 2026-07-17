/**
 * Global, cross-feature types only. Types owned by a single feature belong in
 * that feature's folder (e.g. `app/features/<feature>/types.ts`).
 */

/** Standard shape returned by the backend API. */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Standard paginated list envelope. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Utility: make a component prop optional with a sensible default elsewhere. */
export type Nullable<T> = T | null;
