export function StatusPill({ status }) {
  const normalized = (status ?? 'unknown').toLowerCase();
  const className = normalized === 'up' || normalized === 'healthy' ? 'status-pill up' : 'status-pill down';
  const label = normalized === 'up' || normalized === 'healthy' ? 'UP' : normalized.toUpperCase();

  return <span className={className}>{label}</span>;
}
