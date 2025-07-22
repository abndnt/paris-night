import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { FlightResult } from '../../store/slices/searchSlice';

interface FlightDetailsModalProps {
  flight: FlightResult;
  isOpen: boolean;
  onClose: () => void;
}

const FlightDetailsModal: React.FC<FlightDetailsModalProps> = ({ flight, isOpen, onClose }) => {
  const { pricingMode } = useSelector((state: RootState) => state.search);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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

  const calculateLayoverTime = (arrivalTime: Date | string, departureTime: Date | string) => {
    const arrival = new Date(arrivalTime);
    const departure = new Date(departureTime);
    const diffMinutes = Math.floor((departure.getTime() - arrival.getTime()) / (1000 * 60));
    return formatDuration(diffMinutes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Flight Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Flight Overview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {flight.route[0].origin} → {flight.route[flight.route.length - 1].destination}
                </h3>
                <p className="text-gray-600">
                  {flight.airline} {flight.flightNumber} • {formatDuration(flight.duration)}
                </p>
              </div>
              <div className="text-right">
                {pricingMode === 'cash' ? (
                  <div className="text-2xl font-bold text-green-600">
                    ${flight.pricing.totalPrice.toLocaleString()}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-blue-600">
                    {flight.pricing.pointsOptions[0]?.pointsRequired.toLocaleString() || 'N/A'} pts
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Flight Segments */}
          <div>
            <h4 className="font-semibold mb-4">Flight Itinerary</h4>
            <div className="space-y-4">
              {flight.route.map((segment, index) => (
                <div key={index}>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">
                        {segment.airline} {segment.flightNumber}
                        {segment.operatingAirline && segment.operatingAirline !== segment.airline && (
                          <span className="text-sm text-gray-500 ml-2">
                            (operated by {segment.operatingAirline})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {segment.aircraft && `${segment.aircraft} • `}
                        {formatDuration(segment.duration)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Departure</div>
                        <div className="font-semibold">{formatTime(segment.departureTime)}</div>
                        <div className="text-sm text-gray-600">
                          {segment.origin} • {formatDateTime(segment.departureTime)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Arrival</div>
                        <div className="font-semibold">{formatTime(segment.arrivalTime)}</div>
                        <div className="text-sm text-gray-600">
                          {segment.destination} • {formatDateTime(segment.arrivalTime)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Layover Info */}
                  {index < flight.route.length - 1 && (
                    <div className="flex items-center justify-center py-3">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm">
                        <span className="text-yellow-600 font-medium">
                          Layover in {segment.destination}: {' '}
                          {calculateLayoverTime(segment.arrivalTime, flight.route[index + 1].departureTime)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Details */}
          <div>
            <h4 className="font-semibold mb-4">Pricing Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash Pricing */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-medium text-green-800 mb-3">Cash Price</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base fare:</span>
                    <span>${flight.pricing.cashPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes:</span>
                    <span>${flight.pricing.taxes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fees:</span>
                    <span>${flight.pricing.fees.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-green-300 pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${flight.pricing.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Points Pricing */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-3">Points Options</h5>
                {flight.pricing.pointsOptions.length > 0 ? (
                  <div className="space-y-3">
                    {flight.pricing.pointsOptions.map((option, index) => (
                      <div key={index} className={`p-3 rounded ${option.bestValue ? 'bg-blue-100 border border-blue-300' : 'bg-white border border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{option.program}</span>
                          {option.bestValue && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              Best Value
                            </span>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Points required:</span>
                            <span className="font-medium">{option.pointsRequired.toLocaleString()}</span>
                          </div>
                          {option.cashComponent && (
                            <div className="flex justify-between">
                              <span>Cash component:</span>
                              <span>${option.cashComponent}</span>
                            </div>
                          )}
                          {option.transferRatio && (
                            <div className="flex justify-between">
                              <span>Transfer ratio:</span>
                              <span>1:{option.transferRatio}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No points options available</div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Information */}
          <div>
            <h4 className="font-semibold mb-4">Booking Information</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Booking class:</span>
                  <div className="font-medium">{flight.availability.bookingClass}</div>
                </div>
                <div>
                  <span className="text-gray-500">Fare basis:</span>
                  <div className="font-medium">{flight.availability.fareBasis}</div>
                </div>
                <div>
                  <span className="text-gray-500">Available seats:</span>
                  <div className="font-medium">{flight.availability.availableSeats}</div>
                </div>
              </div>

              {flight.availability.restrictions && flight.availability.restrictions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-2">Restrictions:</div>
                  <ul className="text-sm space-y-1">
                    {flight.availability.restrictions.map((restriction, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-yellow-500 mt-0.5">⚠️</span>
                        <span>{restriction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Select Flight
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlightDetailsModal;