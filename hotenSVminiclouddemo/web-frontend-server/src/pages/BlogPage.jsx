import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchPostBySlug, fetchPosts } from '../api/blogApi';
import { useAsyncResource } from '../hooks/useAsyncResource';

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function excerpt(content, maxLength = 180) {
  const normalized = (content ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const { data, loading, error } = useAsyncResource(() => fetchPosts(page, 6), [page]);
  const posts = data?.data ?? [];
  const pagination = data?.pagination;

  const goToPage = (nextPage) => {
    setSearchParams({ page: String(nextPage) });
  };

  return (
    <div className="page-stack">
      <section className="hero compact">
        <h2>Engineering Blog</h2>
        <p>Live posts served from PostgreSQL with a lightweight production-style admin workflow.</p>
      </section>

      {loading ? <p className="state-text">Loading posts...</p> : null}
      {error ? <p className="state-text error">Failed to load posts: {error.message}</p> : null}

      {!loading && !error ? (
        <>
          {posts.length === 0 ? (
            <section className="panel">
              <h3>No posts yet</h3>
              <p>Create your first post in the Admin panel.</p>
            </section>
          ) : (
            <section className="card-grid">
              {posts.map((post) => (
                <article className="info-card" key={post.slug}>
                  <p className="card-label">{formatDate(post.createdAt)}</p>
                  <h3>{post.title}</h3>
                  <p className="card-subtitle">{excerpt(post.content)}</p>
                  <Link to={`/blog/${post.slug}`} className="inline-link">
                    Read article →
                  </Link>
                </article>
              ))}
            </section>
          )}

          {pagination && pagination.totalPages > 1 ? (
            <section className="panel pagination-row">
              <button
                className="secondary-btn"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                ← Previous
              </button>
              <p className="state-text">
                Page {pagination.page} / {pagination.totalPages}
              </p>
              <button
                className="secondary-btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Next →
              </button>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const { data: post, loading, error } = useAsyncResource(() => fetchPostBySlug(slug), [slug]);

  if (loading) {
    return <p className="state-text">Loading article...</p>;
  }

  if (error) {
    return (
      <section className="panel">
        <h3>Article not found</h3>
        <p>{error.message}</p>
        <Link to="/blog" className="inline-link">
          ← Back to blog
        </Link>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="panel">
        <h3>Article not found</h3>
        <p>The requested post is unavailable.</p>
        <Link to="/blog" className="inline-link">
          ← Back to blog
        </Link>
      </section>
    );
  }

  return (
    <article className="panel article">
      <p className="card-label">{formatDate(post.createdAt)}</p>
      <h2>{post.title}</h2>
      {post.thumbnailUrl ? <img src={post.thumbnailUrl} alt={post.title} className="article-thumbnail" /> : null}
      <section className="article-section">
        <p className="article-body">{post.content}</p>
      </section>
      <Link to="/blog" className="inline-link">
        ← Back to blog
      </Link>
    </article>
  );
}
