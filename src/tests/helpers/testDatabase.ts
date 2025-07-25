import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const testDbConfig = {
  host: process.env['TEST_DB_HOST'] || 'localhost',
  port: parseInt(process.env['TEST_DB_PORT'] || '5432'),
  database: process.env['TEST_DB_NAME'] || 'flight_search_test',
  user: process.env['TEST_DB_USER'] || 'test_user',
  password: process.env['TEST_DB_PASSWORD'] || 'test_password',
};

let testPool: Pool;

export async function setupTestDatabase(): Promise<void> {
  testPool = new Pool(testDbConfig);

  try {
    // Read and execute database initialization scripts
    const initDir = path.join(__dirname, '../../../database/init');
    const initFiles = fs.readdirSync(initDir).sort();

    for (const file of initFiles) {
      if (file.endsWith('.sql')) {
        const sqlContent = fs.readFileSync(path.join(initDir, file), 'utf8');
        await testPool.query(sqlContent);
      }
    }

    console.log('Test database setup completed');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testPool) {
    try {
      // Clean up all tables
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
    } catch (error) {
      console.error('Error cleaning up test database:', error);
      throw error;
    }
  }
}

export async function createTestUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<any> {
  const query = `
    INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, email, first_name, last_name, created_at;
  `;
  
  const result = await testPool.query(query, [
    userData.email,
    userData.password, // In real tests, this should be hashed
    userData.firstName,
    userData.lastName
  ]);
  
  return result.rows[0];
}

export async function createTestFlightSearch(searchData: {
  userId: string;
  origin: string;
  destination: string;
  departureDate: string;
  passengers: number;
  cabinClass: string;
}): Promise<any> {
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

export async function createTestBooking(bookingData: {
  userId: string;
  flightSearchId: string;
  status: string;
  totalCost: number;
  confirmationCode?: string;
}): Promise<any> {
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

export function getTestPool(): Pool {
  return testPool;
}