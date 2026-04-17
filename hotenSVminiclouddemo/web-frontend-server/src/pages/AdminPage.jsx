import { useMemo, useState } from 'react';
import { createPost, deletePost, fetchPosts, getUploadUrl, updatePost } from '../api/blogApi';
import { useAsyncResource } from '../hooks/useAsyncResource';

const TOKEN_STORAGE_KEY = 'minicloud_admin_token';

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
}

function saveToken(nextToken) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken.trim());
}

function clearToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function normalizeToken(rawToken) {
  const trimmed = (rawToken ?? '').trim();
  return trimmed.startsWith('Bearer ') ? trimmed.slice('Bearer '.length).trim() : trimmed;
}

function decodeJwtClaims(token) {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    const payload = tokenParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function formatExpiry(exp) {
  if (typeof exp !== 'number') {
    return 'Unknown';
  }
  const date = new Date(exp * 1000);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid';
  }
  return date.toLocaleString();
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

const initialFormState = {
  title: '',
  content: '',
  thumbnailUrl: ''
};

export function AdminPage() {
  const [tokenInput, setTokenInput] = useState(getStoredToken());
  const [token, setToken] = useState(getStoredToken());
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data, loading, error: loadError, reload } = useAsyncResource(() => fetchPosts(1, 50), []);
  const posts = data?.data ?? [];

  const parsedClaims = useMemo(() => decodeJwtClaims(token), [token]);
  const tokenExpired = useMemo(() => {
    if (!parsedClaims || typeof parsedClaims.exp !== 'number') {
      return false;
    }
    return parsedClaims.exp * 1000 <= Date.now();
  }, [parsedClaims]);

  const authReady = useMemo(() => token.trim().length > 0 && !tokenExpired, [token, tokenExpired]);

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
  };

  const beginEdit = (post) => {
    setForm({
      title: post.title ?? '',
      content: post.content ?? '',
      thumbnailUrl: post.thumbnailUrl ?? ''
    });
    setEditingId(post.id);
    setMessage(`Editing post #${post.id}`);
    setError('');
  };

  const onSaveToken = () => {
    const nextToken = normalizeToken(tokenInput);
    if (!nextToken) {
      setError('Token is empty. Paste a valid Keycloak access token.');
      setMessage('');
      return;
    }

    const claims = decodeJwtClaims(nextToken);
    if (!claims) {
      setError('Token format is invalid.');
      setMessage('');
      return;
    }

    saveToken(nextToken);
    setTokenInput(nextToken);
    setToken(nextToken);
    setMessage('Admin token saved to browser storage and ready for API calls.');
    setError('');
  };

  const onClearToken = () => {
    clearToken();
    setTokenInput('');
    setToken('');
    setMessage('Admin token removed.');
    setError('');
  };

  const onUploadThumbnail = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!authReady) {
      setError('Save a valid non-expired admin bearer token before uploading.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed for thumbnails.');
      return;
    }

    const maxFileSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      setError('Thumbnail size must be 5MB or smaller.');
      return;
    }

    setBusy(true);
    setMessage('Requesting upload URL...');
    setError('');

    try {
      const uploadConfig = await getUploadUrl(file.name, file.type || 'application/octet-stream', token);
      const response = await fetch(uploadConfig.uploadUrl, {
        method: 'PUT',
        headers: {
          ...uploadConfig.headers,
          'Content-Type': file.type || uploadConfig.headers?.['Content-Type'] || 'application/octet-stream'
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }

      setForm((current) => ({
        ...current,
        thumbnailUrl: uploadConfig.publicUrl
      }));
      setMessage('Thumbnail uploaded successfully.');
    } catch (nextError) {
      setError(nextError?.message ?? 'Thumbnail upload failed');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!authReady) {
      setError('Save a valid non-expired admin bearer token before creating or updating posts.');
      return;
    }

    setBusy(true);
    setMessage(editingId ? 'Updating post...' : 'Creating post...');
    setError('');

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      thumbnailUrl: form.thumbnailUrl || null
    };

    if (!payload.title || !payload.content) {
      setError('Title and content are required.');
      return;
    }

    try {
      if (editingId) {
        await updatePost(editingId, payload, token);
        setMessage('Post updated.');
      } else {
        await createPost(payload, token);
        setMessage('Post created.');
      }

      resetForm();
      await reload();
    } catch (nextError) {
      setError(nextError?.message ?? 'Unable to save post');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    if (!authReady) {
      setError('Save an admin bearer token before deleting posts.');
      return;
    }

    if (!window.confirm(`Delete post #${id}?`)) {
      return;
    }

    setBusy(true);
    setMessage(`Deleting post #${id}...`);
    setError('');

    try {
      await deletePost(id, token);
      setMessage('Post deleted.');
      if (editingId === id) {
        resetForm();
      }
      await reload();
    } catch (nextError) {
      setError(nextError?.message ?? 'Unable to delete post');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero compact">
        <h2>Admin Panel</h2>
        <p>Manage blog content, upload thumbnails, and publish through the backend API.</p>
      </section>

      <section className="panel admin-grid">
        <div>
          <h3>Admin Bearer Token</h3>
          <p>
            Paste a Keycloak access token with <code>admin</code> role. You can open{' '}
            <a href="/auth" target="_blank" rel="noreferrer">
              Keycloak
            </a>{' '}
            in a new tab and retrieve a token from your auth flow/tooling.
          </p>
          <textarea
            className="text-area"
            rows={4}
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Paste access token (with or without Bearer prefix)"
          />
          <div className="action-row">
            <button type="button" className="primary-btn" onClick={onSaveToken} disabled={busy}>
              Save Token
            </button>
            <button type="button" className="secondary-btn" onClick={onClearToken} disabled={busy}>
              Clear Token
            </button>
          </div>
          <p className="card-subtitle">Status: {authReady ? 'Ready' : tokenExpired ? 'Expired token' : 'Not configured'}</p>
          <div className="token-meta">
            <p className="card-subtitle">Subject: {parsedClaims?.preferred_username ?? parsedClaims?.sub ?? 'Unknown'}</p>
            <p className="card-subtitle">Expires: {formatExpiry(parsedClaims?.exp)}</p>
          </div>
        </div>

        <div>
          <h3>{editingId ? `Edit Post #${editingId}` : 'Create New Post'}</h3>
          <form className="form-stack" onSubmit={onSubmit}>
            <label className="field">
              <span>Title</span>
              <input
                className="text-input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Post title"
                required
              />
            </label>

            <label className="field">
              <span>Content</span>
              <textarea
                className="text-area"
                rows={7}
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Write your post content"
                required
              />
            </label>

            <label className="field">
              <span>Thumbnail URL</span>
              <input
                className="text-input"
                value={form.thumbnailUrl}
                onChange={(event) => setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>

            {form.thumbnailUrl ? <img src={form.thumbnailUrl} alt="Thumbnail preview" className="thumbnail-preview" /> : null}

            <label className="field">
              <span>Upload Thumbnail (optional)</span>
              <input type="file" className="text-input" accept="image/*" onChange={onUploadThumbnail} disabled={busy} />
            </label>

            <div className="action-row">
              <button type="submit" className="primary-btn" disabled={busy}>
                {editingId ? 'Update Post' : 'Create Post'}
              </button>
              <button type="button" className="secondary-btn" onClick={resetForm} disabled={busy}>
                Reset
              </button>
            </div>
          </form>
        </div>
      </section>

      {message ? <p className="state-text">{message}</p> : null}
      {error ? <p className="state-text error">{error}</p> : null}
      {loadError ? <p className="state-text error">Load error: {loadError.message}</p> : null}

      <section className="panel">
        <h3>Existing Posts</h3>
        {loading ? (
          <p className="state-text">Loading posts...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.id}</td>
                    <td>{post.title}</td>
                    <td>{post.slug}</td>
                    <td>{formatDate(post.updatedAt)}</td>
                    <td className="action-cell">
                      <button type="button" className="secondary-btn" onClick={() => beginEdit(post)} disabled={busy}>
                        Edit
                      </button>
                      <button type="button" className="danger-btn" onClick={() => onDelete(post.id)} disabled={busy}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
