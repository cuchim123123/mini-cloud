import { request, requestJson } from './httpClient';

function toAuthHeaders(token) {
  const trimmed = (token ?? '').trim();
  return trimmed ? { Authorization: `Bearer ${trimmed}` } : {};
}

export function fetchPosts(page = 1, limit = 6) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  return requestJson(`/api/posts?${params.toString()}`);
}

export function fetchPostBySlug(slug) {
  return requestJson(`/api/posts/${encodeURIComponent(slug)}`);
}

export function createPost(input, token) {
  return requestJson('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...toAuthHeaders(token)
    },
    body: JSON.stringify(input)
  });
}

export function updatePost(id, input, token) {
  return requestJson(`/api/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...toAuthHeaders(token)
    },
    body: JSON.stringify(input)
  });
}

export function deletePost(id, token) {
  return request(`/api/posts/${id}`, {
    method: 'DELETE',
    headers: {
      ...toAuthHeaders(token)
    }
  });
}

export function getUploadUrl(filename, contentType, token) {
  const params = new URLSearchParams({ filename, contentType });
  return requestJson(`/api/upload-url?${params.toString()}`, {
    headers: {
      ...toAuthHeaders(token)
    }
  });
}