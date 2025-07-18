"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.initializeDatabase = exports.redisClient = exports.database = exports.pool = void 0;
const pg_1 = require("pg");
const redis_1 = require("redis");
const index_1 = require("./index");
exports.pool = new pg_1.Pool({
    connectionString: index_1.config.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.database = exports.pool;
exports.redisClient = (0, redis_1.createClient)({
    url: index_1.config.redis.url,
});
const initializeDatabase = async () => {
    try {
        const client = await exports.pool.connect();
        console.log('✅ PostgreSQL connected successfully');
        client.release();
        await exports.redisClient.connect();
        console.log('✅ Redis connected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};
exports.initializeDatabase = initializeDatabase;
const closeDatabase = async () => {
    try {
        await exports.pool.end();
        await exports.redisClient.quit();
        console.log('✅ Database connections closed');
    }
    catch (error) {
        console.error('❌ Error closing database connections:', error);
    }
};
exports.closeDatabase = closeDatabase;
//# sourceMappingURL=database.js.map