import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/operations', label: 'Operations' },
  { to: '/blog', label: 'Engineering Blog' }
];

export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-mark">☁</span>
          <div>
            <h1>MyMiniCloud Control Plane</h1>
            <p>Production-style portal powered by the mini-cloud stack</p>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
