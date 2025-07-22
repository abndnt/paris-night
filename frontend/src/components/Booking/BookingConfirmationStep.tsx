import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import { clearBookingFlow } from '../../store/slices/bookingSlice';
import bookingService from '../../services/bookingService';

const BookingConfirmationStep: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentBooking, selectedFlight, formData } = useSelector((state: RootState) => state.booking);

  useEffect(() => {
    // Auto-clear booking flow after 30 seconds to prevent stale state
    const timer = setTimeout(() => {
      dispatch(clearBookingFlow());
    }, 30000);

    return () => clearTimeout(timer);
  }, [dispatch]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const handleDownloadReceipt = async () => {
    if (!currentBooking) return;

    try {
      const receiptBlob = await bookingService.getBookingReceipt(currentBooking.id);
      const url = window.URL.createObjectURL(receiptBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booking-receipt-${currentBooking.confirmationCode || currentBooking.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download receipt:', error);
      // Could show a notification here
    }
  };

  const handleViewBookings = () => {
    dispatch(clearBookingFlow());
    navigate('/bookings');
  };

  const handleNewSearch = () => {
    dispatch(clearBookingFlow());
    navigate('/');
  };

  if (!currentBooking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Booking Found</h2>
          <p className="text-gray-600 mb-4">There was an issue retrieving your booking confirmation.</p>
          <button
            onClick={handleNewSearch}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Start New Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-green-600">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <span className="ml-2 text-sm font-medium">Passenger Info</span>
          </div>
          <div className="flex items-center text-green-600">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <span className="ml-2 text-sm font-medium">Payment</span>
          </div>
          <div className="flex items-center text-green-600">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <span className="ml-2 text-sm font-medium">Review</span>
          </div>
          <div className="flex items-center text-green-600">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <span className="ml-2 text-sm font-medium">Confirmation</span>
          </div>
        </div>
        <div className="mt-2 w-full bg-green-500 rounded-full h-2"></div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
        <p className="text-lg text-gray-600">Your flight has been successfully booked.</p>
      </div>

      {/* Booking Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirmation Details</h3>
          {currentBooking.confirmationCode && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">Confirmation Code</p>
              <p className="text-2xl font-bold text-blue-600 tracking-wider">
                {currentBooking.confirmationCode}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Booking ID</p>
              <p className="font-medium">{currentBooking.id}</p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-medium capitalize text-green-600">{currentBooking.status}</p>
            </div>
            <div>
              <p className="text-gray-600">Booked On</p>
              <p className="font-medium">{formatDate(currentBooking.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Flight Information */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Flight Information</h4>
          <div className="space-y-4">
            {currentBooking.flightDetails.route.map((segment, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {segment.airline} {segment.flightNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {segment.origin} → {segment.destination}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(segment.departureTime)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Departure: {formatTime(segment.departureTime)} | 
                      Arrival: {formatTime(segment.arrivalTime)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Passenger Information */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Passengers</h4>
          <div className="space-y-2">
            {currentBooking.passengers.map((passenger, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span className="font-medium">
                  {passenger.firstName} {passenger.lastName}
                </span>
                <span className="text-sm text-gray-600">
                  {formatDate(passenger.dateOfBirth)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Fare:</span>
              <span>${currentBooking.totalCost.baseFare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxes:</span>
              <span>${currentBooking.totalCost.taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fees:</span>
              <span>${currentBooking.totalCost.fees.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Paid:</span>
                <div className="text-right">
                  <div>${currentBooking.totalCost.totalCash.toFixed(2)}</div>
                  {currentBooking.totalCost.totalPoints && (
                    <div className="text-sm text-gray-600">
                      + {currentBooking.totalCost.totalPoints.toLocaleString()} points
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-yellow-800 mb-2">Important Information</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Please arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights</li>
          <li>• Check-in online 24 hours before your flight departure</li>
          <li>• Ensure all passenger names match exactly with government-issued ID</li>
          <li>• Review baggage policies and restrictions on the airline's website</li>
          <li>• Keep your confirmation code handy for check-in and airport procedures</li>
        </ul>
      </div>

      {/* Next Steps */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
              1
            </div>
            <div>
              <p className="font-medium">Confirmation Email</p>
              <p className="text-gray-600">You'll receive a confirmation email at {formData.contactEmail} within a few minutes.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
              2
            </div>
            <div>
              <p className="font-medium">Online Check-in</p>
              <p className="text-gray-600">Check-in online 24 hours before departure using your confirmation code.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
              3
            </div>
            <div>
              <p className="font-medium">Travel Day</p>
              <p className="text-gray-600">Arrive at the airport with sufficient time and required documents.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleDownloadReceipt}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Download Receipt
        </button>
        <button
          onClick={handleViewBookings}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          View All Bookings
        </button>
        <button
          onClick={handleNewSearch}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Book Another Flight
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmationStep;