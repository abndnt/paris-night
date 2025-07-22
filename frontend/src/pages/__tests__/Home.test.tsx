import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Home from '../Home';
import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';

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

describe('Home Component', () => {
  it('renders hero section with main heading', () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText(/Smart Flight Search with/)).toBeInTheDocument();
    expect(screen.getByText(/AI & Points/)).toBeInTheDocument();
    expect(screen.getByText(/Find the best flight deals using your credit card points/)).toBeInTheDocument();
  });

  it('shows login and signup buttons for unauthenticated users', () => {
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

    renderWithProviders(<Home />, initialState);
    
    expect(screen.getByText('Get Started Free')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('shows welcome message and search button for authenticated users', () => {
    const initialState = {
      auth: {
        isAuthenticated: true,
        user: { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
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

    renderWithProviders(<Home />, initialState);
    
    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    expect(screen.getByText('Ready to find your next adventure?')).toBeInTheDocument();
    expect(screen.getByText('Start Searching Flights')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText('AI-Powered Search')).toBeInTheDocument();
    expect(screen.getByText('Points Optimization')).toBeInTheDocument();
    expect(screen.getByText('Chat Interface')).toBeInTheDocument();
    
    expect(screen.getByText(/Our intelligent system finds the best flight combinations/)).toBeInTheDocument();
    expect(screen.getByText(/Maximize your credit card points and airline miles/)).toBeInTheDocument();
    expect(screen.getByText(/Simply tell us where you want to go/)).toBeInTheDocument();
  });

  it('renders how it works section', () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Connect Accounts')).toBeInTheDocument();
    expect(screen.getByText('Tell Us Your Plans')).toBeInTheDocument();
    expect(screen.getByText('Get Optimized Results')).toBeInTheDocument();
    expect(screen.getByText('Book & Save')).toBeInTheDocument();
  });

  it('renders step descriptions in how it works section', () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByText(/Link your credit card and airline loyalty accounts securely/)).toBeInTheDocument();
    expect(screen.getByText(/Chat with our AI about your travel preferences/)).toBeInTheDocument();
    expect(screen.getByText(/See the best flight options with points vs cash comparisons/)).toBeInTheDocument();
    expect(screen.getByText(/Complete your booking with the best value option/)).toBeInTheDocument();
  });
});