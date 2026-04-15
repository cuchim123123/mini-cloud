import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  getHello() {
    return this.appService.getHello();
  }

  @Get('student')
  getStudent() {
    return this.appService.getStudents();
  }

  @Get('students-db')
  async getStudentsFromDb() {
    return this.appService.getStudentsFromDb();
  }
}
