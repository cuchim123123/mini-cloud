import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostgresService } from './postgres.service';

type Student = {
  id: string;
  name: string;
  major: string;
  gpa: number;
};

@Injectable()
export class AppService {
  constructor(private readonly postgresService: PostgresService) {}

  getHello() {
    return { message: 'Hello from App Server!' };
  }

  getStudents(): Student[] {
    const studentsPath = join(process.cwd(), 'students.json');
    const raw = readFileSync(studentsPath, 'utf-8');
    return JSON.parse(raw) as Student[];
  }

  async getStudentsFromDb() {
    const notes = await this.postgresService.query<{
      id: number;
      title: string;
      created_at: string;
    }>('SELECT id, title, created_at FROM notes ORDER BY id ASC');

    return { data: notes };
  }
}
