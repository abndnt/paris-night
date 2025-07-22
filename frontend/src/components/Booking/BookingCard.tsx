import React from 'react';
import { Booking } from '../../store/slices/bookingSlice';

interface BookingCardProps {
  booking: Booking;
  onView: (bookingId: string) => void;
  onModify?: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onView,
  onModify,
  onCancel,
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'ticketed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const canModify = booking.status === 'confirmed' || booking.status === 'pending';
  const canCancel = booking.status === 'confirmed' || booking.status === 'pending';
  const isPastTravel = new Date(booking.travelDate) < new Date();

  const firstSegment = booking.flightDetails.route[0];
  const lastSegment = booking.flightDetails.route[booking.flightDetails.route.length - 1];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {firstSegment?.origin} → {lastSegment?.destination}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
          {booking.confirmationCode && (
            <p className="text-sm text-gray-600">
              Confirmation: <span className="font-medium">{booking.confirmationCode}</span>
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">
            ${booking.totalCost.totalCash.toFixed(2)}
          </p>
          {booking.totalCost.totalPoints && (
            <p className="text-sm text-gray-600">
              + {booking.totalCost.totalPoints.toLocaleString()} pts
            </p>
          )}
        </div>
      </div>

      {/* Flight Details */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{formatDate(booking.travelDate)}</span>
          <span>{booking.flightDetails.airline} {booking.flightDetails.flightNumber}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {formatTime(firstSegment?.departureTime || new Date())}
            </p>
            <p className="text-sm text-gray-600">{firstSegment?.origin}</p>
          </div>
          
          <div className="flex-1 mx-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs text-gray-500">
                  {Math.floor(booking.flightDetails.duration / 60)}h {booking.flightDetails.duration % 60}m
                </span>
              </div>
            </div>
            {booking.flightDetails.layovers > 0 && (
              <p className="text-xs text-gray-500 text-center mt-1">
                {booking.flightDetails.layovers} stop{booking.flightDetails.layovers > 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {formatTime(lastSegment?.arrivalTime || new Date())}
            </p>
            <p className="text-sm text-gray-600">{lastSegment?.destination}</p>
          </div>
        </div>
      </div>

      {/* Passengers */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">
          Passengers ({booking.passengers.length}):
        </p>
        <div className="flex flex-wrap gap-2">
          {booking.passengers.map((passenger, index) => (
            <span
              key={index}
              className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded"
            >
              {passenger.firstName} {passenger.lastName}
            </span>
          ))}
        </div>
      </div>

      {/* Booking Info */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
        <span>Booked on {formatDate(booking.createdAt)}</span>
        <span>ID: {booking.id.slice(-8)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onView(booking.id)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          View Details
        </button>
        
        {canModify && !isPastTravel && onModify && (
          <button
            onClick={() => onModify(booking.id)}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            Modify
          </button>
        )}
        
        {canCancel && !isPastTravel && onCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingCard;