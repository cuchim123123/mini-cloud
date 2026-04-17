const DEFAULT_TIMEOUT_MS = 6000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new ApiError(`Request failed: ${response.status}`, response.status);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error.message ?? 'Unexpected error', 500);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function requestJson(path, options = {}) {
  const payload = await request(path, options);
  if (payload === null || typeof payload !== 'object') {
    throw new ApiError('Expected JSON response', 500);
  }
  return payload;
}
