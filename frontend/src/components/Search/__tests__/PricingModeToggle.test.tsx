import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PricingModeToggle from '../PricingModeToggle';
import searchReducer, { setPricingMode } from '../../../store/slices/searchSlice';

const createMockStore = (initialPricingMode: 'cash' | 'points' = 'cash') => {
  return configureStore({
    reducer: {
      search: searchReducer,
    },
    preloadedState: {
      search: {
        currentSearch: null,
        searchHistory: [],
        isSearching: false,
        searchError: null,
        sortBy: 'price',
        sortDirection: 'asc',
        pricingMode: initialPricingMode,
        filters: {},
        selectedFlightId: null,
        showFilters: false,
        filteredResults: [],
        resultsPerPage: 20,
        currentPage: 1,
      },
    },
  });
};

describe('PricingModeToggle', () => {
  it('renders both cash and points buttons', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PricingModeToggle />
      </Provider>
    );

    expect(screen.getByText('💵 Cash')).toBeInTheDocument();
    expect(screen.getByText('⭐ Points')).toBeInTheDocument();
  });

  it('shows cash mode as active by default', () => {
    const store = createMockStore('cash');
    render(
      <Provider store={store}>
        <PricingModeToggle />
      </Provider>
    );

    const cashButton = screen.getByText('💵 Cash');
    const pointsButton = screen.getByText('⭐ Points');

    expect(cashButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm');
    expect(pointsButton).toHaveClass('text-gray-600');
  });

  it('shows points mode as active when selected', () => {
    const store = createMockStore('points');
    render(
      <Provider store={store}>
        <PricingModeToggle />
      </Provider>
    );

    const cashButton = screen.getByText('💵 Cash');
    const pointsButton = screen.getByText('⭐ Points');

    expect(pointsButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm');
    expect(cashButton).toHaveClass('text-gray-600');
  });

  it('dispatches setPricingMode when cash button is clicked', () => {
    const store = createMockStore('points');
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <PricingModeToggle />
      </Provider>
    );

    fireEvent.click(screen.getByText('💵 Cash'));

    expect(dispatchSpy).toHaveBeenCalledWith(setPricingMode('cash'));
  });

  it('dispatches setPricingMode when points button is clicked', () => {
    const store = createMockStore('cash');
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <PricingModeToggle />
      </Provider>
    );

    fireEvent.click(screen.getByText('⭐ Points'));

    expect(dispatchSpy).toHaveBeenCalledWith(setPricingMode('points'));
  });

  it('applies hover styles correctly', () => {
    const store = createMockStore('cash');
    render(
      <Provider store={store}>
        <PricingModeToggle />
      </Provider>
    );

    const pointsButton = screen.getByText('⭐ Points');
    expect(pointsButton).toHaveClass('hover:text-gray-800');
  });
});