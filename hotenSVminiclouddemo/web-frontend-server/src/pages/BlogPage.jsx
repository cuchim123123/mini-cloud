import { Link, useParams } from 'react-router-dom';

const blogPosts = [
  {
    slug: 'docker-basics',
    title: 'Getting Started with Docker & Containers',
    publishedAt: 'April 16, 2026',
    sections: [
      {
        heading: 'What are Containers?',
        body: 'Containers package code and dependencies together to guarantee consistent execution in every environment.'
      },
      {
        heading: 'Operational Benefit',
        body: 'In this project, each cloud role runs in a dedicated container and can be independently rebuilt, scaled, and monitored.'
      }
    ]
  },
  {
    slug: 'microservices',
    title: 'Microservices Architecture Patterns',
    publishedAt: 'April 16, 2026',
    sections: [
      {
        heading: 'Decoupled Services',
        body: 'MyMiniCloud applies service decomposition with dedicated web, API, database, identity, storage, and monitoring workloads.'
      },
      {
        heading: 'Gateway Pattern',
        body: 'The API Gateway handles ingress policy and route normalization so frontend consumers stay stable while services evolve.'
      }
    ]
  },
  {
    slug: 'cloud-devops',
    title: 'Cloud Infrastructure & DevOps Best Practices',
    publishedAt: 'April 16, 2026',
    sections: [
      {
        heading: 'Observability by Default',
        body: 'Production architecture starts with telemetry. Prometheus and Grafana are treated as first-class platform dependencies.'
      },
      {
        heading: 'Defense in Depth',
        body: 'Authentication, storage, DNS, and proxy layers are integrated through explicit service contracts and verified regularly.'
      }
    ]
  }
];

export function BlogPage() {
  return (
    <div className="page-stack">
      <section className="hero compact">
        <h2>Engineering Blog</h2>
        <p>Architecture notes from building and operating a full mini-cloud platform.</p>
      </section>

      <section className="card-grid">
        {blogPosts.map((post) => (
          <article className="info-card" key={post.slug}>
            <p className="card-label">{post.publishedAt}</p>
            <h3>{post.title}</h3>
            <Link to={`/blog/${post.slug}`} className="inline-link">
              Read article →
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const post = blogPosts.find((item) => item.slug === slug);

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
      <p className="card-label">{post.publishedAt}</p>
      <h2>{post.title}</h2>
      {post.sections.map((section) => (
        <section key={section.heading} className="article-section">
          <h3>{section.heading}</h3>
          <p>{section.body}</p>
        </section>
      ))}
      <Link to="/blog" className="inline-link">
        ← Back to blog
      </Link>
    </article>
  );
}
