import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setBookingStep, startBooking, bookingSuccess, bookingError } from '../../store/slices/bookingSlice';
import bookingService from '../../services/bookingService';
import LoadingSpinner from '../UI/LoadingSpinner';

const BookingReviewStep: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedFlight, formData, isBooking } = useSelector((state: RootState) => state.booking);
  const { user } = useSelector((state: RootState) => state.auth);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

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

  const calculateTotalCost = () => {
    if (!selectedFlight) return { cash: 0, points: 0 };
    
    const { paymentMethod } = formData;
    if (!paymentMethod) return { cash: selectedFlight.pricing.totalPrice, points: 0 };

    switch (paymentMethod.type) {
      case 'credit_card':
        return { cash: paymentMethod.totalAmount, points: 0 };
      case 'points':
        return { cash: 0, points: paymentMethod.pointsUsed?.points || 0 };
      case 'mixed':
        return {
          cash: paymentMethod.pointsUsed?.cashComponent || 0,
          points: paymentMethod.pointsUsed?.points || 0,
        };
      default:
        return { cash: selectedFlight.pricing.totalPrice, points: 0 };
    }
  };

  const handleConfirmBooking = async () => {
    if (!acceptedTerms) {
      setTermsError('You must accept the terms and conditions to proceed');
      return;
    }

    if (!selectedFlight || !user) {
      dispatch(bookingError('Missing required information'));
      return;
    }

    setTermsError('');
    dispatch(startBooking());

    try {
      const bookingData = {
        flightDetails: selectedFlight,
        passengers: formData.passengers,
        paymentMethod: formData.paymentMethod,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
      };

      const booking = await bookingService.createBooking(bookingData);
      dispatch(bookingSuccess(booking));
    } catch (error) {
      dispatch(bookingError(error instanceof Error ? error.message : 'Failed to create booking'));
    }
  };

  const handleBack = () => {
    dispatch(setBookingStep('payment'));
  };

  const handleEditPassengers = () => {
    dispatch(setBookingStep('passengers'));
  };

  const handleEditPayment = () => {
    dispatch(setBookingStep('payment'));
  };

  if (!selectedFlight) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Flight Selected</h2>
          <p className="text-gray-600 mb-4">Please select a flight to continue with booking.</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const totalCost = calculateTotalCost();

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
          <div className="flex items-center text-blue-600">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span className="ml-2 text-sm font-medium">Review</span>
          </div>
          <div className="flex items-center text-gray-400">
            <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-medium">
              4
            </div>
            <span className="ml-2 text-sm font-medium">Confirmation</span>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Booking</h2>

      {/* Flight Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Flight Details</h3>
        </div>

        <div className="space-y-4">
          {selectedFlight.route.map((segment, index) => (
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
                  <p className="text-sm text-gray-600">
                    Duration: {Math.floor(segment.duration / 60)}h {segment.duration % 60}m
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total Duration:</span>
            <span>{Math.floor(selectedFlight.duration / 60)}h {selectedFlight.duration % 60}m</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Stops:</span>
            <span>{selectedFlight.layovers}</span>
          </div>
        </div>
      </div>

      {/* Passenger Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Passenger Information</h3>
          <button
            onClick={handleEditPassengers}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
        </div>

        <div className="space-y-4">
          {formData.passengers.map((passenger, index) => (
            <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
              <h4 className="font-medium text-gray-900 mb-2">Passenger {index + 1}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{passenger.firstName} {passenger.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Date of Birth:</span>
                  <p className="font-medium">{formatDate(passenger.dateOfBirth)}</p>
                </div>
                {passenger.seatPreference && (
                  <div>
                    <span className="text-gray-600">Seat Preference:</span>
                    <p className="font-medium capitalize">{passenger.seatPreference}</p>
                  </div>
                )}
                {passenger.mealPreference && (
                  <div>
                    <span className="text-gray-600">Meal Preference:</span>
                    <p className="font-medium capitalize">{passenger.mealPreference}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Email:</span>
              <p className="font-medium">{formData.contactEmail}</p>
            </div>
            {formData.contactPhone && (
              <div>
                <span className="text-gray-600">Phone:</span>
                <p className="font-medium">{formData.contactPhone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
          <button
            onClick={handleEditPayment}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
        </div>

        {formData.paymentMethod ? (
          <div className="space-y-4">
            <div>
              <span className="text-gray-600">Payment Method:</span>
              <p className="font-medium capitalize">
                {formData.paymentMethod.type.replace('_', ' ')}
              </p>
            </div>

            {formData.paymentMethod.creditCard && (
              <div>
                <span className="text-gray-600">Credit Card:</span>
                <p className="font-medium">
                  {formData.paymentMethod.creditCard.brand.toUpperCase()} 
                  ending in {formData.paymentMethod.creditCard.last4}
                </p>
              </div>
            )}

            {formData.paymentMethod.pointsUsed && (
              <div>
                <span className="text-gray-600">Points Program:</span>
                <p className="font-medium">
                  {formData.paymentMethod.pointsUsed.program} - 
                  {formData.paymentMethod.pointsUsed.points.toLocaleString()} points
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No payment method selected</p>
        )}
      </div>

      {/* Cost Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Base Fare:</span>
            <span>${selectedFlight.pricing.cashPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Taxes & Fees:</span>
            <span>${(selectedFlight.pricing.taxes + selectedFlight.pricing.fees).toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <div className="text-right">
                {totalCost.cash > 0 && <div>${totalCost.cash.toFixed(2)}</div>}
                {totalCost.points > 0 && <div>{totalCost.points.toLocaleString()} points</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms and Conditions</h3>
        
        <div className="text-sm text-gray-600 space-y-2 mb-4">
          <p>By proceeding with this booking, you agree to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>The airline's terms and conditions</li>
            <li>Our booking and cancellation policies</li>
            <li>The fare rules and restrictions for this ticket</li>
            <li>Providing accurate passenger information</li>
          </ul>
        </div>

        <label className="flex items-start">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked) setTermsError('');
            }}
            className="mt-1 mr-3"
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the terms and conditions, privacy policy, and booking policies.
          </span>
        </label>

        {termsError && (
          <p className="text-red-600 text-sm mt-2">{termsError}</p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={isBooking}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirmBooking}
          disabled={isBooking || !acceptedTerms}
          className="px-8 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          {isBooking ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </div>
    </div>
  );
};

export default BookingReviewStep;