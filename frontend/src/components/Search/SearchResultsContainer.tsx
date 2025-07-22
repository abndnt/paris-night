import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  FlightResult, 
  SortOption, 
  SortDirection,
  updateFilteredResults,
  setCurrentPage 
} from '../../store/slices/searchSlice';
import SearchResultsList from './SearchResultsList';
import SearchFilters from './SearchFilters';
import SearchSortControls from './SearchSortControls';
import PricingModeToggle from './PricingModeToggle';
import SearchPagination from './SearchPagination';
import LoadingSpinner from '../UI/LoadingSpinner';

const SearchResultsContainer: React.FC = () => {
  const dispatch = useDispatch();
  const {
    currentSearch,
    isSearching,
    searchError,
    sortBy,
    sortDirection,
    filters,
    filteredResults,
    showFilters,
    currentPage,
    resultsPerPage,
    pricingMode
  } = useSelector((state: RootState) => state.search);

  // Sort and filter results
  const processedResults = useMemo(() => {
    if (!currentSearch?.results) return [];

    let results = [...currentSearch.results];

    // Apply filters
    if (filters.maxPrice) {
      results = results.filter(flight => 
        pricingMode === 'cash' 
          ? flight.pricing.totalPrice <= filters.maxPrice!
          : flight.pricing.pointsOptions.some(option => 
              (option.pointsRequired + (option.cashComponent || 0)) <= filters.maxPrice!
            )
      );
    }

    if (filters.maxDuration) {
      results = results.filter(flight => flight.duration <= filters.maxDuration!);
    }

    if (filters.maxLayovers !== undefined) {
      results = results.filter(flight => flight.layovers <= filters.maxLayovers!);
    }

    if (filters.airlines?.length) {
      results = results.filter(flight => filters.airlines!.includes(flight.airline));
    }

    if (filters.directFlightsOnly) {
      results = results.filter(flight => flight.layovers === 0);
    }

    if (filters.departureTimeRange) {
      const [minHour, maxHour] = filters.departureTimeRange;
      results = results.filter(flight => {
        const departureHour = new Date(flight.route[0].departureTime).getHours();
        return departureHour >= minHour && departureHour <= maxHour;
      });
    }

    if (filters.arrivalTimeRange) {
      const [minHour, maxHour] = filters.arrivalTimeRange;
      results = results.filter(flight => {
        const lastSegment = flight.route[flight.route.length - 1];
        const arrivalHour = new Date(lastSegment.arrivalTime).getHours();
        return arrivalHour >= minHour && arrivalHour <= maxHour;
      });
    }

    // Apply sorting
    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'price':
          if (pricingMode === 'cash') {
            comparison = a.pricing.totalPrice - b.pricing.totalPrice;
          } else {
            const aPoints = a.pricing.pointsOptions[0]?.pointsRequired || Infinity;
            const bPoints = b.pricing.pointsOptions[0]?.pointsRequired || Infinity;
            comparison = aPoints - bPoints;
          }
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'departure':
          comparison = new Date(a.route[0].departureTime).getTime() - 
                      new Date(b.route[0].departureTime).getTime();
          break;
        case 'arrival':
          const aArrival = a.route[a.route.length - 1].arrivalTime;
          const bArrival = b.route[b.route.length - 1].arrivalTime;
          comparison = new Date(aArrival).getTime() - new Date(bArrival).getTime();
          break;
        case 'points':
          const aPointsValue = a.pricing.pointsOptions[0]?.pointsRequired || Infinity;
          const bPointsValue = b.pricing.pointsOptions[0]?.pointsRequired || Infinity;
          comparison = aPointsValue - bPointsValue;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [currentSearch?.results, filters, sortBy, sortDirection, pricingMode]);

  // Update filtered results in store when processed results change
  useEffect(() => {
    dispatch(updateFilteredResults(processedResults));
  }, [dispatch, processedResults]);

  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return processedResults.slice(startIndex, endIndex);
  }, [processedResults, currentPage, resultsPerPage]);

  const totalPages = Math.ceil(processedResults.length / resultsPerPage);

  if (isSearching) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">Searching for flights...</span>
      </div>
    );
  }

  if (searchError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 font-medium mb-2">Search Error</div>
        <div className="text-red-500">{searchError}</div>
      </div>
    );
  }

  if (!currentSearch) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No search results to display</div>
        <div className="text-gray-400 mt-2">Start a new search to see flight options</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-lg font-semibold">
              {currentSearch.searchCriteria.origin} → {currentSearch.searchCriteria.destination}
            </div>
            <div className="text-gray-500">
              {new Date(currentSearch.searchCriteria.departureDate).toLocaleDateString()}
              {currentSearch.searchCriteria.returnDate && 
                ` - ${new Date(currentSearch.searchCriteria.returnDate).toLocaleDateString()}`
              }
            </div>
            <div className="text-gray-500">
              {currentSearch.searchCriteria.passengers.adults} adult
              {currentSearch.searchCriteria.passengers.adults > 1 ? 's' : ''}
              {currentSearch.searchCriteria.passengers.children > 0 && 
                `, ${currentSearch.searchCriteria.passengers.children} child${currentSearch.searchCriteria.passengers.children > 1 ? 'ren' : ''}`
              }
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {processedResults.length} of {currentSearch.results.length} flights
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <PricingModeToggle />
          <SearchSortControls />
        </div>
        <SearchFilters />
      </div>

      {/* Results */}
      {processedResults.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-600 font-medium mb-2">No flights match your criteria</div>
          <div className="text-gray-500">Try adjusting your filters or search criteria</div>
        </div>
      ) : (
        <>
          <SearchResultsList flights={paginatedResults} />
          {totalPages > 1 && (
            <SearchPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => dispatch(setCurrentPage(page))}
            />
          )}
        </>
      )}
    </div>
  );
};

export default SearchResultsContainer;