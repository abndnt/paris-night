import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  updateFilter, 
  clearFilters, 
  toggleShowFilters,
  SearchFilters as SearchFiltersType 
} from '../../store/slices/searchSlice';

const SearchFilters: React.FC = () => {
  const dispatch = useDispatch();
  const { filters, showFilters, currentSearch } = useSelector((state: RootState) => state.search);
  
  const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters);

  // Get unique airlines from current search results
  const availableAirlines = React.useMemo(() => {
    if (!currentSearch?.results) return [];
    const airlineSet = new Set<string>();
    currentSearch.results.forEach(flight => airlineSet.add(flight.airline));
    const airlines = Array.from(airlineSet);
    return airlines.sort();
  }, [currentSearch?.results]);

  const handleFilterChange = (key: keyof SearchFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    dispatch(updateFilter({ [key]: value }));
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    dispatch(clearFilters());
  };

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof SearchFiltersType];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  if (!showFilters) {
    return (
      <button
        onClick={() => dispatch(toggleShowFilters())}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span>🔍</span>
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
            {activeFiltersCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <div className="flex items-center space-x-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => dispatch(toggleShowFilters())}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Price Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Price
          </label>
          <input
            type="number"
            value={localFilters.maxPrice || ''}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Any price"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Duration Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Duration (hours)
          </label>
          <input
            type="number"
            value={localFilters.maxDuration ? Math.round(localFilters.maxDuration / 60) : ''}
            onChange={(e) => handleFilterChange('maxDuration', e.target.value ? Number(e.target.value) * 60 : undefined)}
            placeholder="Any duration"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Layovers Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Layovers
          </label>
          <select
            value={localFilters.maxLayovers ?? ''}
            onChange={(e) => handleFilterChange('maxLayovers', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any</option>
            <option value="0">Direct only</option>
            <option value="1">1 layover</option>
            <option value="2">2 layovers</option>
            <option value="3">3+ layovers</option>
          </select>
        </div>

        {/* Airlines Filter */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Airlines
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {availableAirlines.map((airline) => (
              <label key={airline} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.airlines?.includes(airline) || false}
                  onChange={(e) => {
                    const currentAirlines = localFilters.airlines || [];
                    const newAirlines = e.target.checked
                      ? [...currentAirlines, airline]
                      : currentAirlines.filter(a => a !== airline);
                    handleFilterChange('airlines', newAirlines.length > 0 ? newAirlines : undefined);
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{airline}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Departure Time Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Departure Time
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="time"
              value={localFilters.departureTimeRange ? 
                String(localFilters.departureTimeRange[0]).padStart(2, '0') + ':00' : ''}
              onChange={(e) => {
                const hour = e.target.value ? parseInt(e.target.value.split(':')[0]) : 0;
                const currentRange = localFilters.departureTimeRange || [0, 23];
                handleFilterChange('departureTimeRange', [hour, currentRange[1]]);
              }}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="time"
              value={localFilters.departureTimeRange ? 
                String(localFilters.departureTimeRange[1]).padStart(2, '0') + ':00' : ''}
              onChange={(e) => {
                const hour = e.target.value ? parseInt(e.target.value.split(':')[0]) : 23;
                const currentRange = localFilters.departureTimeRange || [0, 23];
                handleFilterChange('departureTimeRange', [currentRange[0], hour]);
              }}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        {/* Direct Flights Only */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="directFlightsOnly"
            checked={localFilters.directFlightsOnly || false}
            onChange={(e) => handleFilterChange('directFlightsOnly', e.target.checked || undefined)}
            className="mr-2"
          />
          <label htmlFor="directFlightsOnly" className="text-sm font-medium text-gray-700">
            Direct flights only
          </label>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;