const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v2';

interface FetchOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | undefined;
  body?: unknown | undefined;
  token?: string | undefined;
  locale?: string | undefined;
  cache?: RequestCache | undefined;
  next?: { revalidate?: number | false; tags?: string[] } | undefined;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, msg: string) {
    super(msg);
    this.status = status;
    this.body = body;
  }
}

export const apiFetch = async <T>(path: string, opts: FetchOpts = {}): Promise<T> => {
  const { method = 'GET', body, token, locale = 'ru', cache, next } = opts;

  const fetchOpts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': locale,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (cache !== undefined) {
    fetchOpts.cache = cache;
  }

  if (body !== undefined && body !== null) {
    fetchOpts.body = JSON.stringify(body);
  }
  if (next !== undefined) {
    fetchOpts.next = next;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, fetchOpts);
  } catch (e) {
    throw new ApiError(0, null, `${method} ${path} -> network error: ${(e as Error).message}`);
  }
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        res.status,
        text.slice(0, 200),
        `${method} ${path} -> non-JSON response (status ${res.status})`,
      );
    }
  }
  if (!res.ok) throw new ApiError(res.status, json, `${method} ${path} -> ${res.status}`);
  return json as T;
};
