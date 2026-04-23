const USER_KEY = "ai-story.user";

export type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  lastSeenAt?: string;
};

export function readUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function writeUser(user: StoredUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  window.localStorage.removeItem(USER_KEY);
}

export function clearAuthStorage() {
  clearUser();
}
