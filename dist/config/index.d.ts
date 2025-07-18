export declare const config: {
    server: {
        port: number;
        host: string;
        nodeEnv: string;
    };
    database: {
        url: string;
    };
    redis: {
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    api: {
        prefix: string;
        version: string;
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    logging: {
        level: string;
    };
};
//# sourceMappingURL=index.d.ts.map