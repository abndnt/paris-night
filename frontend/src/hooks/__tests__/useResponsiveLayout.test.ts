import { renderHook } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
import useResponsiveLayout from '../useResponsiveLayout';
import { setMobileState } from '../../store/slices/uiSlice';

// Mock redux
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

describe('useResponsiveLayout', () => {
  const mockDispatch = jest.fn();
  
  beforeEach(() => {
    // Setup mocks
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    
    // Mock window.innerWidth and window.innerHeight
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('dispatches setMobileState on mount', () => {
    renderHook(() => useResponsiveLayout());
    
    expect(mockDispatch).toHaveBeenCalledWith(
      setMobileState(expect.objectContaining({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        orientation: 'landscape',
      }))
    );
  });
  
  it('detects mobile devices correctly', () => {
    // Set window width to mobile size
    Object.defineProperty(window, 'innerWidth', { value: 480 });
    Object.defineProperty(window, 'innerHeight', { value: 800 });
    
    renderHook(() => useResponsiveLayout());
    
    expect(mockDispatch).toHaveBeenCalledWith(
      setMobileState(expect.objectContaining({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        orientation: 'portrait',
      }))
    );
  });
  
  it('detects desktop devices correctly', () => {
    // Set window width to desktop size
    Object.defineProperty(window, 'innerWidth', { value: 1440 });
    Object.defineProperty(window, 'innerHeight', { value: 900 });
    
    renderHook(() => useResponsiveLayout());
    
    expect(mockDispatch).toHaveBeenCalledWith(
      setMobileState(expect.objectContaining({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape',
      }))
    );
  });
  
  it('updates on window resize', () => {
    const { rerender } = renderHook(() => useResponsiveLayout());
    
    // Clear previous calls
    mockDispatch.mockClear();
    
    // Simulate resize event
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });
    window.dispatchEvent(new Event('resize'));
    
    rerender();
    
    expect(mockDispatch).toHaveBeenCalledWith(
      setMobileState(expect.objectContaining({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      }))
    );
  });
});