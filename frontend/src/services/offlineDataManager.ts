/**
 * Service for managing offline data using IndexedDB
 * Provides methods for storing and retrieving data when offline
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'flight-search-offline';
const DB_VERSION = 1;

interface OfflineStore {
  searches: 'searches';
  bookings: 'bookings';
  userPreferences: 'userPreferences';
}

interface OfflineData {
  id: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

class OfflineDataManager {
  private dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object stores
        if (!db.objectStoreNames.contains('searches')) {
          db.createObjectStore('searches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bookings')) {
          db.createObjectStore('bookings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences', { keyPath: 'id' });
        }
      },
    });
  }

  /**
   * Store data in the specified store
   */
  async storeData<T>(
    storeName: keyof OfflineStore, 
    id: string, 
    data: T, 
    expirationMinutes = 60
  ): Promise<void> {
    if (!this.dbPromise) {
      this.initDB();
    }

    const db = await this.dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const timestamp = Date.now();
    const expiresAt = expirationMinutes > 0 
      ? timestamp + (expirationMinutes * 60 * 1000) 
      : undefined;

    await store.put({
      id,
      data,
      timestamp,
      expiresAt
    });

    return tx.done;
  }

  /**
   * Retrieve data from the specified store
   */
  async getData<T>(storeName: keyof OfflineStore, id: string): Promise<T | null> {
    if (!this.dbPromise) {
      this.initDB();
    }

    try {
      const db = await this.dbPromise;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      
      const item = await store.get(id) as OfflineData | undefined;
      
      if (!item) {
        return null;
      }
      
      // Check if data has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        // Data expired, delete it
        const deleteTx = db.transaction(storeName, 'readwrite');
        await deleteTx.objectStore(storeName).delete(id);
        return null;
      }
      
      return item.data as T;
    } catch (error) {
      console.error('Error retrieving offline data:', error);
      return null;
    }
  }

  /**
   * Get all items from a store
   */
  async getAllData<T>(storeName: keyof OfflineStore): Promise<T[]> {
    if (!this.dbPromise) {
      this.initDB();
    }

    try {
      const db = await this.dbPromise;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      
      const items = await store.getAll() as OfflineData[];
      const now = Date.now();
      
      // Filter out expired items
      return items
        .filter(item => !item.expiresAt || item.expiresAt > now)
        .map(item => item.data as T);
    } catch (error) {
      console.error('Error retrieving all offline data:', error);
      return [];
    }
  }

  /**
   * Delete data from the specified store
   */
  async deleteData(storeName: keyof OfflineStore, id: string): Promise<void> {
    if (!this.dbPromise) {
      this.initDB();
    }

    const db = await this.dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    await store.delete(id);
    return tx.done;
  }

  /**
   * Clear all expired data across all stores
   */
  async clearExpiredData(): Promise<void> {
    if (!this.dbPromise) {
      this.initDB();
    }

    const db = await this.dbPromise;
    const now = Date.now();
    const storeNames: (keyof OfflineStore)[] = ['searches', 'bookings', 'userPreferences'];
    
    for (const storeName of storeNames) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      
      const items = await store.getAll() as OfflineData[];
      
      for (const item of items) {
        if (item.expiresAt && item.expiresAt < now) {
          await store.delete(item.id);
        }
      }
      
      await tx.done;
    }
  }
}

// Export singleton instance
export const offlineDataManager = new OfflineDataManager();
export default offlineDataManager;