import { renderHook } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
import useOfflineDetection from '../useOfflineDetection';
import { setPWAState, addNotification } from '../../store/slices/uiSlice';

// Mock redux
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

describe('useOfflineDetection', () => {
  const mockDispatch = jest.fn();
  
  beforeEach(() => {
    // Setup mocks
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { 
      writable: true, 
      configurable: true, 
      value: true 
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('dispatches setPWAState with initial online status on mount', () => {
    renderHook(() => useOfflineDetection());
    
    expect(mockDispatch).toHaveBeenCalledWith(
      setPWAState({ isOnline: true })
    );
  });
  
  it('dispatches setPWAState and notification when going offline', () => {
    renderHook(() => useOfflineDetection());
    
    // Clear previous calls
    mockDispatch.mockClear();
    
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));
    
    expect(mockDispatch).toHaveBeenCalledWith(
      setPWAState({ isOnline: false })
    );
    
    expect(mockDispatch).toHaveBeenCalledWith(
      addNotification({
        type: 'warning',
        message: 'You are offline. Some features may be limited.'
      })
    );
  });
  
  it('dispatches setPWAState and notification when coming back online', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    renderHook(() => useOfflineDetection());
    
    // Clear previous calls
    mockDispatch.mockClear();
    
    // Simulate coming back online
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));
    
    expect(mockDispatch).toHaveBeenCalledWith(
      setPWAState({ isOnline: true })
    );
    
    expect(mockDispatch).toHaveBeenCalledWith(
      addNotification({
        type: 'success',
        message: 'You are back online!'
      })
    );
  });
});