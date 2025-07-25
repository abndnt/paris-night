import { Pool } from 'pg';
export declare function setupTestDatabase(): Promise<void>;
export declare function cleanupTestDatabase(): Promise<void>;
export declare function createTestUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}): Promise<any>;
export declare function createTestFlightSearch(searchData: {
    userId: string;
    origin: string;
    destination: string;
    departureDate: string;
    passengers: number;
    cabinClass: string;
}): Promise<any>;
export declare function createTestBooking(bookingData: {
    userId: string;
    flightSearchId: string;
    status: string;
    totalCost: number;
    confirmationCode?: string;
}): Promise<any>;
export declare function getTestPool(): Pool;
//# sourceMappingURL=testDatabase.d.ts.map