export const YOUTH_USER_STORAGE_KEY = "yd_youth_user_id";

/** Stable per-browser user id for Postgres-backed sync (not auth). */
export function getYouthUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(YOUTH_USER_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(YOUTH_USER_STORAGE_KEY, id);
  }
  return id;
}
