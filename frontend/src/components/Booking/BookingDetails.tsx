import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import {
  startLoadingBookingDetails,
  loadBookingDetailsSuccess,
  loadBookingDetailsError,
  startCancellation,
  cancellationSuccess,
  cancellationError,
} from '../../store/slices/bookingSlice';
import bookingService from '../../services/bookingService';
import LoadingSpinner from '../UI/LoadingSpinner';

const BookingDetails: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { bookings, isLoadingBookingDetails, bookingDetailsError, isCancelling } = useSelector(
    (state: RootState) => state.booking
  );
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const booking = bookings.find(b => b.id === bookingId);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (bookingId && !booking) {
      loadBookingDetails();
    }
  }, [bookingId, booking, isAuthenticated, navigate]);

  const loadBookingDetails = async () => {
    if (!bookingId) return;

    dispatch(startLoadingBookingDetails());
    try {
      const bookingDetails = await bookingService.getBooking(bookingId);
      dispatch(loadBookingDetailsSuccess(bookingDetails));
    } catch (error) {
      dispatch(loadBookingDetailsError(error instanceof Error ? error.message : 'Failed to load booking details'));
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingId) return;

    dispatch(startCancellation());
    try {
      await bookingService.cancelBooking(bookingId, cancelReason);
      dispatch(cancellationSuccess(bookingId));
      setShowCancelModal(false);
      setCancelReason('');
      // Reload booking details to get updated status
      loadBookingDetails();
    } catch (error) {
      dispatch(cancellationError(error instanceof Error ? error.message : 'Failed to cancel booking'));
    }
  };

  const handleDownloadReceipt = async () => {
    if (!bookingId) return;

    try {
      const receiptBlob = await bookingService.getBookingReceipt(bookingId);
      const url = window.URL.createObjectURL(receiptBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booking-receipt-${booking?.confirmationCode || bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download receipt:', error);
      // Could show a notification here
    }
  };

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

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view booking details.</p>
        </div>
      </div>
    );
  }

  if (isLoadingBookingDetails) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (bookingDetailsError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{bookingDetailsError}</p>
          <button
            onClick={() => navigate('/bookings')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The requested booking could not be found.</p>
          <button
            onClick={() => navigate('/bookings')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const canCancel = (booking.status === 'confirmed' || booking.status === 'pending') && 
                   new Date(booking.travelDate) > new Date();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/bookings')}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 flex items-center"
        >
          ← Back to Bookings
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Details</h1>
            <div className="flex items-center gap-4">
              {booking.confirmationCode && (
                <p className="text-gray-600">
                  Confirmation: <span className="font-medium">{booking.confirmationCode}</span>
                </p>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${booking.totalCost.totalCash.toFixed(2)}
            </p>
            {booking.totalCost.totalPoints && (
              <p className="text-sm text-gray-600">
                + {booking.totalCost.totalPoints.toLocaleString()} points
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Flight Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Flight Information</h2>
        
        <div className="space-y-6">
          {booking.flightDetails.route.map((segment, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {segment.airline} {segment.flightNumber}
                  </h3>
                  <p className="text-gray-600">{segment.aircraft}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Duration: {Math.floor(segment.duration / 60)}h {segment.duration % 60}m</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Departure</p>
                  <p className="font-medium text-lg">{formatTime(segment.departureTime)}</p>
                  <p className="text-gray-600">{segment.origin}</p>
                  <p className="text-sm text-gray-500">{formatDate(segment.departureTime)}</p>
                </div>
                
                <div className="text-center">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-2 text-sm text-gray-500">
                        {Math.floor(segment.duration / 60)}h {segment.duration % 60}m
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Arrival</p>
                  <p className="font-medium text-lg">{formatTime(segment.arrivalTime)}</p>
                  <p className="text-gray-600">{segment.destination}</p>
                  <p className="text-sm text-gray-500">{formatDate(segment.arrivalTime)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Duration</p>
              <p className="font-medium">{Math.floor(booking.flightDetails.duration / 60)}h {booking.flightDetails.duration % 60}m</p>
            </div>
            <div>
              <p className="text-gray-600">Stops</p>
              <p className="font-medium">{booking.flightDetails.layovers}</p>
            </div>
            <div>
              <p className="text-gray-600">Booking Class</p>
              <p className="font-medium">{booking.flightDetails.availability.bookingClass}</p>
            </div>
            <div>
              <p className="text-gray-600">Fare Basis</p>
              <p className="font-medium">{booking.flightDetails.availability.fareBasis}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Passenger Information</h2>
        
        <div className="space-y-4">
          {booking.passengers.map((passenger, index) => (
            <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
              <h3 className="font-medium text-gray-900 mb-2">Passenger {index + 1}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium">{passenger.firstName} {passenger.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date of Birth</p>
                  <p className="font-medium">{formatDate(passenger.dateOfBirth)}</p>
                </div>
                {passenger.passportNumber && (
                  <div>
                    <p className="text-gray-600">Passport Number</p>
                    <p className="font-medium">{passenger.passportNumber}</p>
                  </div>
                )}
                {passenger.knownTravelerNumber && (
                  <div>
                    <p className="text-gray-600">Known Traveler Number</p>
                    <p className="font-medium">{passenger.knownTravelerNumber}</p>
                  </div>
                )}
                {passenger.seatPreference && (
                  <div>
                    <p className="text-gray-600">Seat Preference</p>
                    <p className="font-medium capitalize">{passenger.seatPreference}</p>
                  </div>
                )}
                {passenger.mealPreference && (
                  <div>
                    <p className="text-gray-600">Meal Preference</p>
                    <p className="font-medium capitalize">{passenger.mealPreference}</p>
                  </div>
                )}
              </div>
              {passenger.specialRequests && passenger.specialRequests.length > 0 && (
                <div className="mt-2">
                  <p className="text-gray-600 text-sm">Special Requests</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {passenger.specialRequests.map((request, reqIndex) => (
                      <li key={reqIndex}>{request}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Information */}
      {booking.paymentMethod && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Payment Method</h3>
              <p className="text-gray-600 capitalize mb-4">
                {booking.paymentMethod.type.replace('_', ' ')}
              </p>

              {booking.paymentMethod.creditCard && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Credit Card</p>
                  <p className="font-medium">
                    {booking.paymentMethod.creditCard.brand.toUpperCase()} 
                    ending in {booking.paymentMethod.creditCard.last4}
                  </p>
                  <p className="text-sm text-gray-600">
                    {booking.paymentMethod.creditCard.holderName}
                  </p>
                </div>
              )}

              {booking.paymentMethod.pointsUsed && (
                <div>
                  <p className="text-sm text-gray-600">Points Program</p>
                  <p className="font-medium">
                    {booking.paymentMethod.pointsUsed.program}
                  </p>
                  <p className="text-sm text-gray-600">
                    {booking.paymentMethod.pointsUsed.points.toLocaleString()} points used
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Cost Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Fare:</span>
                  <span>${booking.totalCost.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes:</span>
                  <span>${booking.totalCost.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fees:</span>
                  <span>${booking.totalCost.fees.toFixed(2)}</span>
                </div>
                {booking.totalCost.pointsValue && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Points Value:</span>
                    <span>${booking.totalCost.pointsValue.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <div className="text-right">
                      <div>${booking.totalCost.totalCash.toFixed(2)}</div>
                      {booking.totalCost.totalPoints && (
                        <div className="text-sm text-gray-600">
                          + {booking.totalCost.totalPoints.toLocaleString()} points
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking History */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking History</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Booking Created</span>
            <span className="font-medium">{formatDate(booking.createdAt)} at {formatTime(booking.createdAt)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Last Updated</span>
            <span className="font-medium">{formatDate(booking.updatedAt)} at {formatTime(booking.updatedAt)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Travel Date</span>
            <span className="font-medium">{formatDate(booking.travelDate)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleDownloadReceipt}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Download Receipt
        </button>
        
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-6 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
          >
            Cancel Booking
          </button>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Booking</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter reason for cancellation..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isCancelling ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetails;