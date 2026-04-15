import { PrismaService } from './prisma.service';
type Student = {
    id: string;
    name: string;
    major: string;
    gpa: number;
};
export declare class AppService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHello(): {
        message: string;
    };
    getStudents(): Student[];
    getStudentsFromDb(): Promise<{
        data: {
            id: number;
            title: string;
            createdAt: Date;
        }[];
    }>;
}
export {};
