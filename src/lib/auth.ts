/** Authentication service backed by Supabase Auth. */
import { ApiError, apiRequest } from "./api";
import { getCurrentAccessToken, getSupabaseClient, isSupabaseConfigured } from "./supabase";

export type AuthResponse = {
  access_token: string | null;
  token_type?: string;
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

function authError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    const status =
      typeof error === "object" && "status" in error && typeof error.status === "number"
        ? error.status
        : 401;
    const message = error.message.includes("Invalid login credentials")
      ? "Invalid email or password."
      : error.message;
    return new ApiError(message, status, error);
  }
  return new ApiError("Authentication failed. Please try again.", 401, error);
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  try {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { full_name: input.full_name.trim() } },
    });
    if (error) throw error;
    if (!data.user) throw new ApiError("Supabase did not return a user.", 502);
    return { access_token: data.session?.access_token ?? null, token_type: "bearer" };
  } catch (error) {
    throw authError(error);
  }
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (error) throw error;
    if (!data.session) throw new ApiError("Supabase did not create an authenticated session.", 401);
    return { access_token: data.session.access_token, token_type: "bearer" };
  } catch (error) {
    throw authError(error);
  }
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw authError(error);
  }
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem("latest_resume_profile");
    } catch {
      /* storage unavailable */
    }
  }
}

export async function isAuthenticated(): Promise<boolean> {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return false;
  return Boolean(await getCurrentAccessToken());
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

/** GET /api/v1/auth/me — uses the current Supabase access token. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/auth/me", { method: "GET", auth: "required" });
}

export { getCurrentAccessToken };
