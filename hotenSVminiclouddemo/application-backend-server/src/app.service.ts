import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from './prisma.service';

type Student = {
  id: string;
  name: string;
  major: string;
  gpa: number;
};

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello() {
    return { message: 'Hello from App Server!' };
  }

  getStudents(): Student[] {
    const studentsPath = join(process.cwd(), 'students.json');
    const raw = readFileSync(studentsPath, 'utf-8');
    return JSON.parse(raw) as Student[];
  }

  async getStudentsFromDb() {
    const notes = await this.prisma.note.findMany({
      orderBy: { id: 'asc' }
    });

    return { data: notes };
  }
}
