import { useMemo } from 'react';
import { fetchDatabaseNotes, fetchHello, fetchStaticStudents } from '../api/platformApi';
import { useAsyncResource } from '../hooks/useAsyncResource';

function OverviewCards({ helloMessage, studentsCount, notesCount }) {
  const cards = [
    {
      title: 'Application API',
      value: helloMessage ?? 'Unavailable',
      subtitle: 'Response from NestJS backend'
    },
    {
      title: 'Directory Students',
      value: studentsCount,
      subtitle: 'Records from static student service'
    },
    {
      title: 'Database Notes',
      value: notesCount,
      subtitle: 'Rows queried from PostgreSQL'
    }
  ];

  return (
    <section className="card-grid">
      {cards.map((card) => (
        <article key={card.title} className="info-card">
          <p className="card-label">{card.title}</p>
          <h3>{card.value}</h3>
          <p className="card-subtitle">{card.subtitle}</p>
        </article>
      ))}
    </section>
  );
}

export function OverviewPage() {
  const { data, loading, error, reload } = useAsyncResource(async () => {
    const [hello, students, notes] = await Promise.all([
      fetchHello(),
      fetchStaticStudents(),
      fetchDatabaseNotes()
    ]);

    return {
      helloMessage: hello?.message ?? 'N/A',
      studentsCount: Array.isArray(students) ? students.length : 0,
      notesCount: Array.isArray(notes?.data) ? notes.data.length : 0
    };
  }, []);

  const architectureHighlights = useMemo(
    () => [
      'Gateway-first API topology via Nginx reverse proxy',
      'Backend-for-frontend pattern for service aggregation and resilience',
      'Health and dependency visibility with Prometheus + Grafana + Keycloak + MinIO',
      'Containerized production parity across all cloud components'
    ],
    []
  );

  return (
    <div className="page-stack">
      <section className="hero">
        <h2>Production-grade cloud demo portal</h2>
        <p>
          This frontend now uses real runtime APIs instead of static placeholders. It continuously integrates with application,
          database, and observability services through the gateway.
        </p>
        <button type="button" className="primary-btn" onClick={reload}>
          Refresh Live Data
        </button>
      </section>

      {loading ? <p className="state-text">Loading live platform data...</p> : null}
      {error ? <p className="state-text error">{error.message}</p> : null}
      {data ? (
        <OverviewCards
          helloMessage={data.helloMessage}
          studentsCount={data.studentsCount}
          notesCount={data.notesCount}
        />
      ) : null}

      <section className="panel">
        <h3>Architecture Upgrades</h3>
        <ul>
          {architectureHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
