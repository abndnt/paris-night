import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import PWAInstallPrompt from '../PWAInstallPrompt';
import { hideInstallPrompt } from '../../../store/slices/uiSlice';

// Mock redux store
const mockStore = configureStore([]);

describe('PWAInstallPrompt', () => {
  let store: any;
  
  beforeEach(() => {
    // Create a mock store with PWA state
    store = mockStore({
      ui: {
        pwa: {
          showInstallPrompt: true,
          canInstall: true,
          isInstalled: false,
          isOnline: true
        }
      }
    });
    
    // Mock dispatch
    store.dispatch = jest.fn();
    
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
      },
      writable: true
    });
  });
  
  it('renders the install prompt when conditions are met', () => {
    render(
      <Provider store={store}>
        <PWAInstallPrompt />
      </Provider>
    );
    
    expect(screen.getByText('Install Flight Search')).toBeInTheDocument();
    expect(screen.getByText('Get quick access and work offline with our app')).toBeInTheDocument();
    expect(screen.getByText('Install')).toBeInTheDocument();
    expect(screen.getByText('Not now')).toBeInTheDocument();
  });
  
  it('does not render when showInstallPrompt is false', () => {
    store = mockStore({
      ui: {
        pwa: {
          showInstallPrompt: false,
          canInstall: true,
          isInstalled: false,
          isOnline: true
        }
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <PWAInstallPrompt />
      </Provider>
    );
    
    expect(container.firstChild).toBeNull();
  });
  
  it('does not render when canInstall is false', () => {
    store = mockStore({
      ui: {
        pwa: {
          showInstallPrompt: true,
          canInstall: false,
          isInstalled: false,
          isOnline: true
        }
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <PWAInstallPrompt />
      </Provider>
    );
    
    expect(container.firstChild).toBeNull();
  });
  
  it('does not render when already dismissed in session storage', () => {
    (window.sessionStorage.getItem as jest.Mock).mockReturnValue('true');
    
    const { container } = render(
      <Provider store={store}>
        <PWAInstallPrompt />
      </Provider>
    );
    
    expect(container.firstChild).toBeNull();
  });
  
  it('dispatches hideInstallPrompt when dismiss button is clicked', () => {
    render(
      <Provider store={store}>
        <PWAInstallPrompt />
      </Provider>
    );
    
    fireEvent.click(screen.getByText('Not now'));
    
    expect(store.dispatch).toHaveBeenCalledWith(hideInstallPrompt());
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', 'true');
  });
});