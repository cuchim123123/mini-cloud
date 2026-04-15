import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): {
        message: string;
    };
    getStudent(): {
        id: string;
        name: string;
        major: string;
        gpa: number;
    }[];
    getStudentsFromDb(): Promise<{
        data: {
            id: number;
            title: string;
            createdAt: Date;
        }[];
    }>;
}
