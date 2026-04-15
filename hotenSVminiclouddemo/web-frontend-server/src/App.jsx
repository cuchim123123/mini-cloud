import { Link, Route, Routes } from 'react-router-dom';

function HomePage() {
  return (
    <main className="container">
      <h1>MyMiniCloud – Home</h1>
      <p>React + Vite frontend served by Nginx.</p>
      <Link to="/blog">Go to Blog</Link>
    </main>
  );
}

function BlogPage() {
  return (
    <main className="container">
      <h1>MyMiniCloud Blog</h1>
      <p>This is the blog page.</p>
      <Link to="/">Back</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/blog" element={<BlogPage />} />
    </Routes>
  );
}
