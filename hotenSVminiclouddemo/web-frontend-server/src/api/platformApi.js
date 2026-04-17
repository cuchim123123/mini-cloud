import { requestJson } from './httpClient';

export function fetchHello() {
  return requestJson('/api/hello');
}

export function fetchStaticStudents() {
  return requestJson('/api/student');
}

export function fetchDatabaseNotes() {
  return requestJson('/api/students-db');
}

export function fetchPlatformSummary() {
  return requestJson('/api/platform/summary', { timeoutMs: 8000 });
}
