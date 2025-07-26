import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import FlightSearchForm from '../components/Search/FlightSearchForm';
import SearchResultsContainer from '../components/Search/SearchResultsContainer';

const Search: React.FC = () => {
  const { currentSearch, isSearching } = useSelector((state: RootState) => state.search);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Flight</h1>
        <p className="text-gray-600">
          Search for flights and compare prices with points optimization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search Form */}
        <div className="lg:col-span-1">
          <FlightSearchForm />
        </div>

        {/* Search Results */}
        <div className="lg:col-span-2">
          {(currentSearch || isSearching) ? (
            <SearchResultsContainer />
          ) : (
            <div className="card text-center py-12">
              <div className="text-gray-500 text-lg mb-2">Ready to search for flights?</div>
              <div className="text-gray-400">
                Fill out the search form to find the best flight deals
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;