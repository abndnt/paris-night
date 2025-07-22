import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  setSortBy, 
  setSortDirection, 
  SortOption, 
  SortDirection 
} from '../../store/slices/searchSlice';

const SearchSortControls: React.FC = () => {
  const dispatch = useDispatch();
  const { sortBy, sortDirection, pricingMode } = useSelector((state: RootState) => state.search);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'price', label: pricingMode === 'cash' ? 'Price' : 'Points' },
    { value: 'duration', label: 'Duration' },
    { value: 'departure', label: 'Departure Time' },
    { value: 'arrival', label: 'Arrival Time' },
  ];

  const handleSortChange = (newSortBy: SortOption) => {
    if (newSortBy === sortBy) {
      // Toggle direction if same sort option
      dispatch(setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      // Set new sort option with default direction
      dispatch(setSortBy(newSortBy));
      dispatch(setSortDirection('asc'));
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">Sort by:</span>
      <div className="flex items-center space-x-1">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
              sortBy === option.value
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <span>{option.label}</span>
            {sortBy === option.value && (
              <span className="text-xs">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchSortControls;