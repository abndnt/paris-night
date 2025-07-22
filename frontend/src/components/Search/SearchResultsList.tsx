import React from 'react';
import { FlightResult } from '../../store/slices/searchSlice';
import FlightResultCard from './FlightResultCard';

interface SearchResultsListProps {
  flights: FlightResult[];
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({ flights }) => {
  if (flights.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No flights found matching your criteria</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flights.map((flight) => (
        <FlightResultCard key={flight.id} flight={flight} />
      ))}
    </div>
  );
};

export default SearchResultsList;