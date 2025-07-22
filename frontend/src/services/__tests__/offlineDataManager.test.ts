import { offlineDataManager } from '../offlineDataManager';

// Mock IndexedDB
const mockIDB = {
  openDB: jest.fn(),
  transaction: jest.fn(),
  objectStore: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
};

jest.mock('idb', () => ({
  openDB: (...args: any[]) => mockIDB.openDB(...args),
}));

describe('offlineDataManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementation
    mockIDB.openDB.mockResolvedValue({
      transaction: mockIDB.transaction,
    });
    
    mockIDB.transaction.mockReturnValue({
      objectStore: mockIDB.objectStore,
      done: Promise.resolve(),
    });
    
    mockIDB.objectStore.mockReturnValue({
      put: mockIDB.put,
      get: mockIDB.get,
      getAll: mockIDB.getAll,
      delete: mockIDB.delete,
    });
    
    mockIDB.put.mockResolvedValue(undefined);
    mockIDB.get.mockResolvedValue(undefined);
    mockIDB.getAll.mockResolvedValue([]);
    mockIDB.delete.mockResolvedValue(undefined);
    
    // Reset the dbPromise
    (offlineDataManager as any).dbPromise = null;
  });
  
  it('initializes the database on first use', async () => {
    await offlineDataManager.storeData('searches', 'test-id', { test: 'data' });
    
    expect(mockIDB.openDB).toHaveBeenCalledWith(
      'flight-search-offline',
      1,
      expect.any(Object)
    );
  });
  
  it('stores data with expiration time', async () => {
    const testData = { test: 'data' };
    const testId = 'test-id';
    
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    
    await offlineDataManager.storeData('searches', testId, testData, 30);
    
    expect(mockIDB.put).toHaveBeenCalledWith({
      id: testId,
      data: testData,
      timestamp: 1000,
      expiresAt: 1000 + (30 * 60 * 1000), // 30 minutes
    });
  });
  
  it('retrieves stored data', async () => {
    const testData = { test: 'data' };
    const testId = 'test-id';
    
    mockIDB.get.mockResolvedValue({
      id: testId,
      data: testData,
      timestamp: 1000,
    });
    
    const result = await offlineDataManager.getData('searches', testId);
    
    expect(result).toEqual(testData);
    expect(mockIDB.get).toHaveBeenCalledWith(testId);
  });
  
  it('returns null for expired data and deletes it', async () => {
    const testId = 'test-id';
    const now = 2000;
    
    jest.spyOn(Date, 'now').mockReturnValue(now);
    
    mockIDB.get.mockResolvedValue({
      id: testId,
      data: { test: 'data' },
      timestamp: 1000,
      expiresAt: 1500, // Already expired
    });
    
    const result = await offlineDataManager.getData('searches', testId);
    
    expect(result).toBeNull();
    expect(mockIDB.delete).toHaveBeenCalledWith(testId);
  });
  
  it('retrieves all non-expired data from a store', async () => {
    const now = 2000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    
    const testData = [
      {
        id: 'id1',
        data: { test: 'data1' },
        timestamp: 1000,
        expiresAt: 3000, // Not expired
      },
      {
        id: 'id2',
        data: { test: 'data2' },
        timestamp: 1000,
        expiresAt: 1500, // Expired
      },
      {
        id: 'id3',
        data: { test: 'data3' },
        timestamp: 1000,
        // No expiration
      },
    ];
    
    mockIDB.getAll.mockResolvedValue(testData);
    
    const result = await offlineDataManager.getAllData('searches');
    
    // Should only include non-expired items
    expect(result).toEqual([
      { test: 'data1' },
      { test: 'data3' },
    ]);
  });
  
  it('deletes data from a store', async () => {
    const testId = 'test-id';
    
    await offlineDataManager.deleteData('searches', testId);
    
    expect(mockIDB.delete).toHaveBeenCalledWith(testId);
  });
  
  it('clears expired data from all stores', async () => {
    await offlineDataManager.clearExpiredData();
    
    // Should have opened transactions for all stores
    expect(mockIDB.transaction).toHaveBeenCalledWith('searches', 'readwrite');
    expect(mockIDB.transaction).toHaveBeenCalledWith('bookings', 'readwrite');
    expect(mockIDB.transaction).toHaveBeenCalledWith('userPreferences', 'readwrite');
  });
});