import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SearchSortControls from '../SearchSortControls';
import searchReducer, { SortOption, SortDirection } from '../../../store/slices/searchSlice';

const createMockStore = (
  sortBy: SortOption = 'price',
  sortDirection: SortDirection = 'asc',
  pricingMode: 'cash' | 'points' = 'cash'
) => {
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
        sortBy,
        sortDirection,
        pricingMode,
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

const renderWithStore = (
  sortBy: SortOption = 'price',
  sortDirection: SortDirection = 'asc',
  pricingMode: 'cash' | 'points' = 'cash'
) => {
  const store = createMockStore(sortBy, sortDirection, pricingMode);
  return {
    ...render(
      <Provider store={store}>
        <SearchSortControls />
      </Provider>
    ),
    store,
  };
};

describe('SearchSortControls', () => {
  it('renders all sort options', () => {
    renderWithStore();
    
    expect(screen.getByText('Sort by:')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Departure Time')).toBeInTheDocument();
    expect(screen.getByText('Arrival Time')).toBeInTheDocument();
  });

  it('shows "Price" label in cash mode', () => {
    renderWithStore('price', 'asc', 'cash');
    
    expect(screen.getByText('Price')).toBeInTheDocument();
  });

  it('shows "Points" label in points mode', () => {
    renderWithStore('price', 'asc', 'points');
    
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('highlights the active sort option', () => {
    renderWithStore('duration', 'asc');
    
    const durationButton = screen.getByText('Duration').closest('button');
    const priceButton = screen.getByText('Price').closest('button');
    
    expect(durationButton).toHaveClass('bg-blue-100', 'text-blue-700', 'border-blue-200');
    expect(priceButton).toHaveClass('text-gray-600');
    expect(priceButton).not.toHaveClass('bg-blue-100');
  });

  it('shows ascending direction indicator', () => {
    renderWithStore('price', 'asc');
    
    const priceButton = screen.getByText('Price').closest('button');
    expect(priceButton).toHaveTextContent('↑');
  });

  it('shows descending direction indicator', () => {
    renderWithStore('price', 'desc');
    
    const priceButton = screen.getByText('Price').closest('button');
    expect(priceButton).toHaveTextContent('↓');
  });

  it('changes sort option when clicking different option', () => {
    const { store } = renderWithStore('price', 'asc');
    
    const durationButton = screen.getByText('Duration').closest('button');
    fireEvent.click(durationButton!);
    
    const state = store.getState();
    expect(state.search.sortBy).toBe('duration');
    expect(state.search.sortDirection).toBe('asc'); // Should reset to asc for new option
  });

  it('toggles sort direction when clicking same option', () => {
    const { store } = renderWithStore('price', 'asc');
    
    const priceButton = screen.getByText('Price').closest('button');
    fireEvent.click(priceButton!);
    
    const state = store.getState();
    expect(state.search.sortBy).toBe('price');
    expect(state.search.sortDirection).toBe('desc'); // Should toggle to desc
  });

  it('toggles from desc to asc when clicking same option twice', () => {
    const { store } = renderWithStore('price', 'desc');
    
    const priceButton = screen.getByText('Price').closest('button');
    fireEvent.click(priceButton!);
    
    const state = store.getState();
    expect(state.search.sortBy).toBe('price');
    expect(state.search.sortDirection).toBe('asc'); // Should toggle back to asc
  });

  it('has proper hover states for inactive buttons', () => {
    renderWithStore('price', 'asc');
    
    const durationButton = screen.getByText('Duration').closest('button');
    expect(durationButton).toHaveClass('hover:text-gray-800', 'hover:bg-gray-100');
  });

  it('handles all sort options correctly', () => {
    const { store } = renderWithStore();
    
    const sortOptions = [
      { text: 'Duration', expected: 'duration' },
      { text: 'Departure', expected: 'departure' },
      { text: 'Arrival', expected: 'arrival' },
    ];
    
    sortOptions.forEach(({ text, expected }) => {
      const button = screen.getByText(text).closest('button');
      fireEvent.click(button!);
      
      const state = store.getState();
      expect(state.search.sortBy).toBe(expected);
    });
  });

  it('maintains consistent button styling', () => {
    renderWithStore();
    
    const buttons = [
      screen.getByText('Price').closest('button'),
      screen.getByText('Duration').closest('button'),
      screen.getByText('Departure').closest('button'),
      screen.getByText('Arrival').closest('button'),
    ];
    
    buttons.forEach(button => {
      expect(button).toHaveClass(
        'flex',
        'items-center',
        'space-x-1',
        'px-3',
        'py-2',
        'rounded-md',
        'text-sm',
        'font-medium',
        'transition-colors'
      );
    });
  });

  it('shows no direction indicator for inactive options', () => {
    renderWithStore('price', 'asc');
    
    const durationButton = screen.getByText('Duration').closest('button');
    expect(durationButton).not.toHaveTextContent('↑');
    expect(durationButton).not.toHaveTextContent('↓');
  });
});