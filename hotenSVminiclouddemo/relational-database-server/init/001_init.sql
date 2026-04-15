CREATE DATABASE minicloud;
\connect minicloud;

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notes(title) VALUES ('Hello from PostgreSQL!');
