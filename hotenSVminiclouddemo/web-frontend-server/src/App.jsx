import { Link, Route, Routes } from 'react-router-dom';

function HomePage() {
  return (
    <main className="container">
      <h1>🌩️ MyMiniCloud – Home</h1>
      <p>React + Vite frontend served by Nginx.</p>
      <p>MyMiniCloud is a comprehensive mini-cloud infrastructure system built with Docker, featuring 9+ containerized services including web, app, database, authentication, storage, DNS, and monitoring components.</p>
      <Link to="/blog" style={{fontSize: '18px', padding: '10px 20px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px', display: 'inline-block'}}>📚 Visit Blog</Link>
    </main>
  );
}

function BlogListPage() {
  const posts = [
    { id: 1, title: 'Getting Started with Docker & Containers', slug: 'docker-basics' },
    { id: 2, title: 'Microservices Architecture Patterns', slug: 'microservices' },
    { id: 3, title: 'Cloud Infrastructure & DevOps Best Practices', slug: 'cloud-devops' }
  ];
  
  return (
    <main className="container">
      <h1>📖 MyMiniCloud Blog</h1>
      <p>Learn about cloud infrastructure, containerization, and modern DevOps practices.</p>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px'}}>
        {posts.map(post => (
          <div key={post.id} style={{border: '1px solid #ddd', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <h2 style={{marginTop: 0}}>{post.title}</h2>
            <Link to={`/blog/${post.slug}`} style={{color: '#007bff', textDecoration: 'none', fontWeight: 'bold'}}>Read More →</Link>
          </div>
        ))}
      </div>
      <div style={{marginTop: '40px'}}>
        <Link to="/" style={{color: '#007bff', textDecoration: 'none'}}>← Back to Home</Link>
      </div>
    </main>
  );
}

function BlogPost1() {
  return (
    <article className="blog-post">
      <h1>🐳 Getting Started with Docker & Containers</h1>
      <p><small>Published: April 16, 2026</small></p>
      
      <h2>What are Containers?</h2>
      <p>Containers are lightweight, standalone, executable packages that include everything needed to run an application. Docker revolutionized how we deploy software by making containerization accessible and practical.</p>
      
      <h2>Why Docker?</h2>
      <ul>
        <li><strong>Consistency:</strong> Runs the same way on any system</li>
        <li><strong>Isolation:</strong> Each container has its own filesystem and resources</li>
        <li><strong>Portability:</strong> Easy to move between machines and cloud platforms</li>
        <li><strong>Scalability:</strong> Simple to spin up multiple instances</li>
      </ul>
      
      <h2>Basic Docker Commands</h2>
      <pre style={{background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflow: 'auto'}}>
{`docker run -d nginx:latest
docker ps
docker logs container_id
docker stop container_id`}
      </pre>
      
      <h2>Getting Started</h2>
      <p>Start with official images from Docker Hub, then create your own Dockerfile to customize your application container. MyMiniCloud demonstrates this with custom builds for web, app, and other services.</p>
      
      <Link to="/blog" style={{color: '#007bff', textDecoration: 'none'}}>← Back to Blog</Link>
    </article>
  );
}

function BlogPost2() {
  return (
    <article className="blog-post">
      <h1>🏗️ Microservices Architecture Patterns</h1>
      <p><small>Published: April 16, 2026</small></p>
      
      <h2>Understanding Microservices</h2>
      <p>Microservices architecture breaks down applications into small, independent services that communicate over the network. This is in contrast to monolithic applications where all code runs as a single unit.</p>
      
      <h2>Key Characteristics</h2>
      <ul>
        <li><strong>Decentralized:</strong> Each service owns its data and logic</li>
        <li><strong>Scalable:</strong> Scale individual services based on demand</li>
        <li><strong>Resilient:</strong> Failure in one service doesn't crash the whole system</li>
        <li><strong>Technology Diversity:</strong> Use different tech stacks for different services</li>
      </ul>
      
      <h2>MyMiniCloud Example</h2>
      <p>Our mini-cloud implements microservices with separate containers for:</p>
      <ul>
        <li>Web Frontend (Nginx + React)</li>
        <li>API Backend (NestJS)</li>
        <li>Database (PostgreSQL)</li>
        <li>Authentication (Keycloak)</li>
        <li>Object Storage (MinIO)</li>
      </ul>
      
      <h2>Communication Patterns</h2>
      <p>Services communicate via REST APIs, message queues, or service meshes. The API Gateway acts as the single entry point, routing requests to appropriate services.</p>
      
      <Link to="/blog" style={{color: '#007bff', textDecoration: 'none'}}>← Back to Blog</Link>
    </article>
  );
}

function BlogPost3() {
  return (
    <article className="blog-post">
      <h1>☁️ Cloud Infrastructure & DevOps Best Practices</h1>
      <p><small>Published: April 16, 2026</small></p>
      
      <h2>Modern Cloud Infrastructure</h2>
      <p>Cloud infrastructure has transformed how organizations deploy and manage applications. With containerization and orchestration, we can build highly available, scalable systems.</p>
      
      <h2>Essential Components</h2>
      <ul>
        <li><strong>Compute:</strong> Containers, VMs, serverless functions</li>
        <li><strong>Storage:</strong> Object storage, databases, file systems</li>
        <li><strong>Networking:</strong> DNS, load balancers, API gateways</li>
        <li><strong>Monitoring:</strong> Metrics, logs, alerting</li>
        <li><strong>Security:</strong> Authentication, encryption, access control</li>
      </ul>
      
      <h2>DevOps Best Practices</h2>
      <ul>
        <li>Infrastructure as Code (IaC) - Define everything in version control</li>
        <li>CI/CD Pipelines - Automate build, test, and deployment</li>
        <li>Monitoring & Observability - Understand system health in real-time</li>
        <li>Security by Default - Implement security at every layer</li>
        <li>Scalability Planning - Design for growth from the start</li>
      </ul>
      
      <h2>Real-World Implementation</h2>
      <p>MyMiniCloud demonstrates these practices with Docker Compose for orchestration, PostgreSQL for data persistence, Prometheus + Grafana for monitoring, and Keycloak for secure authentication.</p>
      
      <Link to="/blog" style={{color: '#007bff', textDecoration: 'none'}}>← Back to Blog</Link>
    </article>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/docker-basics" element={<BlogPost1 />} />
      <Route path="/blog/microservices" element={<BlogPost2 />} />
      <Route path="/blog/cloud-devops" element={<BlogPost3 />} />
    </Routes>
  );
}
