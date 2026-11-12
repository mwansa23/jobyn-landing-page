/** Authentication service backed by Firebase Auth with Jobyn API provisioning. */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";

import {
  ApiError,
  apiRequest,
  clearStoredToken,
  getStoredToken,
  setStoredToken as storeApiToken,
} from "./api";
import {
  getCurrentFirebaseIdToken,
  getFirebaseAuth,
  getFirebaseCurrentUser,
  isFirebaseConfigured,
  waitForFirebaseAuthPersistence,
} from "./firebase";

export type AuthResponse = {
  access_token: string;
  token_type?: string;
  [key: string]: unknown;
};

export type RegisterInput = {
  email: string;
  password: string;
  full_name: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

function firebaseAuthError(error: unknown): ApiError {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/user-disabled": "This account is disabled.",
  };

  return new ApiError(messages[code] ?? "Authentication failed. Please try again.", 401, error);
}

async function authResponse(user: User): Promise<AuthResponse> {
  const accessToken = await user.getIdToken();
  if (!accessToken) throw new ApiError("Firebase did not return an ID token.", 401);

  // The API accepts this identity only when it is already bound to a Jobyn
  // account; Firebase authentication does not create or link accounts.
  await apiRequest<CurrentUser>("/api/v1/auth/me", { method: "GET", auth: true });

  return {
    access_token: accessToken,
    token_type: "bearer",
  };
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  let credential: UserCredential | null = null;
  try {
    const auth = await waitForFirebaseAuthPersistence();
    credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password,
    );

    if (input.full_name.trim()) {
      await updateProfile(credential.user, { displayName: input.full_name.trim() });
    }

    return await authResponse(credential.user);
  } catch (error) {
    // Roll back the Firebase account if anything after creation failed, so a
    // failed Jobyn provisioning does not leave an orphaned, unusable account.
    if (credential) {
      await deleteUser(credential.user).catch(() => undefined);
    }
    if (error instanceof ApiError) throw error;
    throw firebaseAuthError(error);
  }
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    const auth = await waitForFirebaseAuthPersistence();
    const credential = await signInWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password,
    );
    return authResponse(credential.user);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw firebaseAuthError(error);
  }
}

export function logout(): void {
  if (isFirebaseConfigured()) {
    try {
      void signOut(getFirebaseAuth()).catch(() => undefined);
    } catch {
      // Firebase is optional when using the legacy Jobyn token.
    }
  }
  clearStoredToken();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem("latest_resume_profile");
    } catch {
      /* storage unavailable */
    }
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getFirebaseCurrentUser() ?? getStoredToken());
}

/** Public user payload from GET /api/v1/auth/me (UserRead). */
export type CurrentUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: "admin" | "user";
  created_at: string;
};

const USER_KEY = "jobyn.user";

export function setStoredToken(token: string): void {
  storeApiToken(token);
}

export function setStoredUser(user: CurrentUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
}

/** GET /api/v1/auth/me — uses the current Firebase ID token when available. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/auth/me", { method: "GET", auth: true });
}

export { getCurrentFirebaseIdToken as getFirebaseIdToken, getStoredToken };
