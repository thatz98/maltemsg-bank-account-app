import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export class LoggingService {
    private logFile: string;
    private readonly LOGS_DIR = 'logs';

    constructor(logFileName: string = 'service.log') {
        // Create logs directory if it doesn't exist
        const logsDir = path.join(process.cwd(), this.LOGS_DIR);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        // Add date to log filename
        const date = new Date().toISOString().split('T')[0];
        const fileName = `${date}-${logFileName}`;
        this.logFile = path.join(logsDir, fileName);
    }

    public debug(message: string): void {
        this.log(message, LogLevel.DEBUG);
    }

    public info(message: string): void {
        this.log(message, LogLevel.INFO);
    }

    public warn(message: string): void {
        this.log(message, LogLevel.WARN);
    }

    public error(message: string): void {
        this.log(message, LogLevel.ERROR);
    }

    private log(message: string, level: LogLevel): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;
        fs.appendFileSync(this.logFile, logMessage);
    }
} 