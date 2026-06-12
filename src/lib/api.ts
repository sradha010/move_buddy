const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

function getToken(): string | null {
  return localStorage.getItem('buddyride_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error?.message ?? `Request failed: ${res.status}`);
  }

  const json = await res.json();
  // Unwrap transform interceptor { success, data } if present
  return (json?.data !== undefined ? json.data : json) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
