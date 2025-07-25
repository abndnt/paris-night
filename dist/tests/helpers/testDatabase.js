"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTestDatabase = setupTestDatabase;
exports.cleanupTestDatabase = cleanupTestDatabase;
exports.createTestUser = createTestUser;
exports.createTestFlightSearch = createTestFlightSearch;
exports.createTestBooking = createTestBooking;
exports.getTestPool = getTestPool;
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const testDbConfig = {
    host: process.env['TEST_DB_HOST'] || 'localhost',
    port: parseInt(process.env['TEST_DB_PORT'] || '5432'),
    database: process.env['TEST_DB_NAME'] || 'flight_search_test',
    user: process.env['TEST_DB_USER'] || 'test_user',
    password: process.env['TEST_DB_PASSWORD'] || 'test_password',
};
let testPool;
async function setupTestDatabase() {
    testPool = new pg_1.Pool(testDbConfig);
    try {
        const initDir = path_1.default.join(__dirname, '../../../database/init');
        const initFiles = fs_1.default.readdirSync(initDir).sort();
        for (const file of initFiles) {
            if (file.endsWith('.sql')) {
                const sqlContent = fs_1.default.readFileSync(path_1.default.join(initDir, file), 'utf8');
                await testPool.query(sqlContent);
            }
        }
        console.log('Test database setup completed');
    }
    catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
}
async function cleanupTestDatabase() {
    if (testPool) {
        try {
            await testPool.query(`
        TRUNCATE TABLE 
          bookings,
          payments,
          flight_searches,
          reward_accounts,
          travel_preferences,
          notifications,
          chat_sessions,
          chat_messages,
          users
        RESTART IDENTITY CASCADE;
      `);
            await testPool.end();
            console.log('Test database cleanup completed');
        }
        catch (error) {
            console.error('Error cleaning up test database:', error);
            throw error;
        }
    }
}
async function createTestUser(userData) {
    const query = `
    INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, email, first_name, last_name, created_at;
  `;
    const result = await testPool.query(query, [
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName
    ]);
    return result.rows[0];
}
async function createTestFlightSearch(searchData) {
    const query = `
    INSERT INTO flight_searches (
      user_id, origin, destination, departure_date, 
      passengers, cabin_class, status, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'completed', NOW())
    RETURNING *;
  `;
    const result = await testPool.query(query, [
        searchData.userId,
        searchData.origin,
        searchData.destination,
        searchData.departureDate,
        searchData.passengers,
        searchData.cabinClass
    ]);
    return result.rows[0];
}
async function createTestBooking(bookingData) {
    const query = `
    INSERT INTO bookings (
      user_id, flight_search_id, status, total_cost, 
      confirmation_code, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *;
  `;
    const result = await testPool.query(query, [
        bookingData.userId,
        bookingData.flightSearchId,
        bookingData.status,
        bookingData.totalCost,
        bookingData.confirmationCode || null
    ]);
    return result.rows[0];
}
function getTestPool() {
    return testPool;
}
//# sourceMappingURL=testDatabase.js.map