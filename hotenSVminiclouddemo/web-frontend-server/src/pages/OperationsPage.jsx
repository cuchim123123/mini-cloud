import { fetchPlatformSummary } from '../api/platformApi';
import { StatusPill } from '../components/StatusPill';
import { useAsyncResource } from '../hooks/useAsyncResource';

function DependencyTable({ dependencies }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Dependency</th>
            <th>Status</th>
            <th>Latency</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {dependencies.map((dependency) => (
            <tr key={dependency.name}>
              <td>{dependency.name}</td>
              <td>
                <StatusPill status={dependency.status} />
              </td>
              <td>{dependency.latencyMs} ms</td>
              <td>{dependency.details ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OperationsPage() {
  const { data, loading, error, reload } = useAsyncResource(() => fetchPlatformSummary(), []);

  return (
    <div className="page-stack">
      <section className="hero compact">
        <h2>Operations Dashboard</h2>
        <p>Live dependency checks are orchestrated by the NestJS API layer with upstream timeouts and structured summaries.</p>
        <button type="button" className="primary-btn" onClick={reload}>
          Re-run Platform Checks
        </button>
      </section>

      {loading ? <p className="state-text">Running dependency checks...</p> : null}
      {error ? <p className="state-text error">{error.message}</p> : null}

      {data ? (
        <>
          <section className="card-grid">
            <article className="info-card">
              <p className="card-label">Overall Status</p>
              <h3>
                <StatusPill status={data.overallStatus} />
              </h3>
              <p className="card-subtitle">Snapshot generated at {new Date(data.generatedAt).toLocaleString()}</p>
            </article>
            <article className="info-card">
              <p className="card-label">Keycloak Users</p>
              <h3>{data.data.keycloakUsers}</h3>
              <p className="card-subtitle">Users detected in realm configuration</p>
            </article>
            <article className="info-card">
              <p className="card-label">Database Records</p>
              <h3>{data.data.studentsCount + data.data.notesCount}</h3>
              <p className="card-subtitle">
                {data.data.studentsCount} students + {data.data.notesCount} notes
              </p>
            </article>
          </section>

          <section className="panel">
            <h3>Dependency Health</h3>
            <DependencyTable dependencies={data.dependencies} />
          </section>
        </>
      ) : null}
    </div>
  );
}
