import type { ErrorBody, FieldError } from "./types";

const API_ROOT = "/api";
const CSRF_COOKIE = "csrftoken";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, FieldError[]>;
  readonly meta: Record<string, string | number>;

  constructor(status: number, body: ErrorBody) {
    super(body.detail ?? "Request failed");
    this.status = status;
    this.code = body.code ?? "server_error";
    this.fields = body.fields ?? {};
    this.meta = body.meta ?? {};
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
}

function readCookie(name: string): string | null {
  const row = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.slice(name.length + 1)) : null;
}

async function ensureCsrfCookie(): Promise<string | null> {
  if (!readCookie(CSRF_COOKIE)) {
    await fetch(`${API_ROOT}/v1/auth/session/`, { credentials: "same-origin" });
  }
  return readCookie(CSRF_COOKIE);
}

export async function request<T>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (method !== "GET") {
    const token = await ensureCsrfCookie();
    if (token) {
      headers["X-CSRFToken"] = token;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, { code: "network" });
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data as ErrorBody);
  }
  return data as T;
}
