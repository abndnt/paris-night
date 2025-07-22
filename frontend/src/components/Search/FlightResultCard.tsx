import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { FlightResult, selectFlight } from '../../store/slices/searchSlice';
import { useResponsive } from '../../hooks/useMediaQuery';
import FlightDetailsModal from './FlightDetailsModal';

interface FlightResultCardProps {
  flight: FlightResult;
}

const FlightResultCard: React.FC<FlightResultCardProps> = ({ flight }) => {
  const dispatch = useDispatch();
  const { pricingMode } = useSelector((state: RootState) => state.search);
  const [showDetails, setShowDetails] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const firstSegment = flight.route[0];
  const lastSegment = flight.route[flight.route.length - 1];
  
  const bestPointsOption = flight.pricing.pointsOptions.find(option => option.bestValue) || 
                          flight.pricing.pointsOptions[0];

  const handleSelect = () => {
    dispatch(selectFlight(flight.id));
  };

  const handleShowDetails = () => {
    setShowDetails(true);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow touch-manipulation">
        {isMobile ? (
          // Mobile Layout - Stacked
          <div className="space-y-4">
            {/* Flight Route */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {/* Departure */}
                <div className="text-center">
                  <div className="text-lg font-bold">{formatTime(firstSegment.departureTime)}</div>
                  <div className="text-sm text-gray-600">{firstSegment.origin}</div>
                </div>

                {/* Flight Path */}
                <div className="flex-1 flex items-center px-2">
                  <div className="flex-1 border-t border-gray-300 relative">
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-white px-1">
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDuration(flight.duration)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrival */}
                <div className="text-center">
                  <div className="text-lg font-bold">{formatTime(lastSegment.arrivalTime)}</div>
                  <div className="text-sm text-gray-600">{lastSegment.destination}</div>
                </div>
              </div>
            </div>

            {/* Flight Details */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                {flight.airline} {flight.flightNumber}
                {flight.layovers > 0 && (
                  <span className="ml-2 text-gray-500">
                    {flight.layovers} stop{flight.layovers > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {flight.availability.availableSeats} seats left
              </div>
            </div>

            {/* Pricing and Actions */}
            <div className="flex items-center justify-between">
              <div>
                {pricingMode === 'cash' ? (
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      ${flight.pricing.totalPrice.toLocaleString()}
                    </div>
                    {bestPointsOption && (
                      <div className="text-sm text-blue-600">
                        or {bestPointsOption.pointsRequired.toLocaleString()} pts
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {bestPointsOption ? (
                      <>
                        <div className="text-xl font-bold text-blue-600">
                          {bestPointsOption.pointsRequired.toLocaleString()} pts
                        </div>
                        <div className="text-sm text-gray-500">
                          {bestPointsOption.program}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500">Points not available</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleShowDetails}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm touch-manipulation"
                >
                  Details
                </button>
                <button
                  onClick={handleSelect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium touch-manipulation"
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Desktop/Tablet Layout - Horizontal
          <div className="flex items-center justify-between">
            {/* Flight Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-8">
                {/* Departure */}
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatTime(firstSegment.departureTime)}</div>
                  <div className="text-sm text-gray-600">{firstSegment.origin}</div>
                  <div className="text-xs text-gray-500">{formatDate(firstSegment.departureTime)}</div>
                </div>

                {/* Flight Path */}
                <div className="flex-1 flex items-center">
                  <div className="flex-1 border-t-2 border-gray-300 relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-2">
                      <div className="text-xs text-gray-500 text-center">
                        {formatDuration(flight.duration)}
                      </div>
                      {flight.layovers > 0 && (
                        <div className="text-xs text-gray-400 text-center">
                          {flight.layovers} stop{flight.layovers > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrival */}
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatTime(lastSegment.arrivalTime)}</div>
                  <div className="text-sm text-gray-600">{lastSegment.destination}</div>
                  <div className="text-xs text-gray-500">{formatDate(lastSegment.arrivalTime)}</div>
                </div>
              </div>

              {/* Airline and Flight Number */}
              <div className="mt-4 flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {flight.airline} {flight.flightNumber}
                </div>
                {flight.route.length > 1 && (
                  <div className="text-sm text-gray-500">
                    via {flight.route.slice(1, -1).map(segment => segment.origin).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="ml-8 text-right">
              {pricingMode === 'cash' ? (
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ${flight.pricing.totalPrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    + ${flight.pricing.taxes + flight.pricing.fees} taxes & fees
                  </div>
                  {bestPointsOption && (
                    <div className="text-sm text-blue-600 mt-1">
                      or {bestPointsOption.pointsRequired.toLocaleString()} pts
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {bestPointsOption ? (
                    <>
                      <div className="text-2xl font-bold text-blue-600">
                        {bestPointsOption.pointsRequired.toLocaleString()} pts
                      </div>
                      {bestPointsOption.cashComponent && (
                        <div className="text-sm text-gray-500">
                          + ${bestPointsOption.cashComponent} cash
                        </div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        {bestPointsOption.program}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">
                      Points not available
                    </div>
                  )}
                </div>
              )}

              {/* Availability */}
              <div className="text-xs text-gray-400 mt-2">
                {flight.availability.availableSeats} seats left
              </div>
            </div>

            {/* Actions */}
            <div className="ml-6 flex flex-col space-y-2">
              <button
                onClick={handleSelect}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Select
              </button>
              <button
                onClick={handleShowDetails}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Details
              </button>
            </div>
          </div>
        )}

        {/* Additional Info */}
        {(flight.layovers > 0 || flight.availability.restrictions?.length) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              {flight.layovers > 0 && flight.layoverDuration && (
                <div className="flex items-center space-x-1">
                  <span>⏱️</span>
                  <span>Layover: {formatDuration(flight.layoverDuration)}</span>
                </div>
              )}
              {flight.availability.restrictions?.length && (
                <div className="flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>Restrictions apply</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <span>✈️</span>
                <span>{flight.availability.bookingClass}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && (
        <FlightDetailsModal
          flight={flight}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
};

export default FlightResultCard;