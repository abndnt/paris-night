import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Layout from '../Layout';

// Mock redux store
const mockStore = configureStore([]);

// Mock the hooks
jest.mock('../../../hooks/useResponsiveLayout', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../hooks/useTouchGestures', () => ({
  useTouchGestures: jest.fn().mockImplementation((options) => {
    // Store the callbacks for testing
    (global as any).mockSwipeCallbacks = options;
    return { current: null };
  }),
}));

describe('Layout - Mobile Responsiveness', () => {
  let store: any;
  let mockEventListener: jest.Mock;
  
  beforeEach(() => {
    store = mockStore({
      ui: {
        mobile: {
          isMobile: true,
          isTablet: false,
          isDesktop: false,
          orientation: 'portrait'
        }
      }
    });
    
    // Mock document event listener
    mockEventListener = jest.fn();
    document.addEventListener = mockEventListener;
  });
  
  it('applies mobile-specific classes', () => {
    const { container } = render(
      <Provider store={store}>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </Provider>
    );
    
    // Check for responsive classes
    expect(container.firstChild).toHaveClass('min-h-screen');
    expect(container.firstChild).toHaveClass('safe-area-inset');
  });
  
  it('triggers custom events on swipe gestures', () => {
    render(
      <Provider store={store}>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </Provider>
    );
    
    // Get the stored callbacks
    const swipeCallbacks = (global as any).mockSwipeCallbacks;
    
    // Create a mock event dispatcher
    const mockDispatchEvent = jest.fn();
    document.dispatchEvent = mockDispatchEvent;
    
    // Trigger swipe right callback
    swipeCallbacks.onSwipeRight();
    
    // Check if the custom event was dispatched
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mobile-swipe-right'
      })
    );
    
    // Trigger swipe left callback
    swipeCallbacks.onSwipeLeft();
    
    // Check if the custom event was dispatched
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mobile-swipe-left'
      })
    );
  });
  
  it('renders children correctly', () => {
    const { getByText } = render(
      <Provider store={store}>
        <Layout>
          <div>Mobile Test Content</div>
        </Layout>
      </Provider>
    );
    
    expect(getByText('Mobile Test Content')).toBeInTheDocument();
  });
});