const DEFAULT_TIMEOUT_MS = 6000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function requestJson(path, options = {}) {
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

    return await response.json();
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
