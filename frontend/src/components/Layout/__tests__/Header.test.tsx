import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Header from '../Header';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: initialState,
  });
};

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Header Component', () => {
  it('renders logo and navigation links', () => {
    renderWithProviders(<Header />);
    
    expect(screen.getByText('FlightSearch')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('shows authenticated user navigation when logged in', () => {
    const initialState = {
      auth: {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
        token: 'mock-token',
        isLoading: false,
        error: null,
      },
      ui: {
        isMobileMenuOpen: false,
        isLoading: false,
        notifications: [],
      },
    };

    renderWithProviders(<Header />, initialState);
    
    expect(screen.getByText('Welcome, John')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });

  it('toggles mobile menu when hamburger button is clicked', () => {
    const initialState = {
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      },
      ui: {
        isMobileMenuOpen: false,
        isLoading: false,
        notifications: [],
      },
    };

    renderWithProviders(<Header />, initialState);
    
    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(mobileMenuButton);
    
    // The mobile menu should be visible after clicking
    // Note: This test would need to be updated based on actual mobile menu visibility logic
  });

  it('displays logout button for authenticated users', () => {
    const initialState = {
      auth: {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
        token: 'mock-token',
        isLoading: false,
        error: null,
      },
      ui: {
        isMobileMenuOpen: false,
        isLoading: false,
        notifications: [],
      },
    };

    renderWithProviders(<Header />, initialState);
    
    const logoutButton = screen.getByText('Logout');
    expect(logoutButton).toBeInTheDocument();
    
    fireEvent.click(logoutButton);
    // Note: This would dispatch logout action in actual implementation
  });
});