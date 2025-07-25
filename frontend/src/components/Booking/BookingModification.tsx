import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import {
  startLoadingBookingDetails,
  loadBookingDetailsSuccess,
  loadBookingDetailsError,
  startModification,
  modificationSuccess,
  updatePassengers,
  updatePaymentMethod,
  updateContactInfo,
} from '../../store/slices/bookingSlice';
import { PassengerInfo, PaymentMethod } from '../../store/slices/bookingSlice';
import bookingService from '../../services/bookingService';
import PassengerForm from './PassengerForm';
import LoadingSpinner from '../UI/LoadingSpinner';

const BookingModification: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { bookings, isLoadingBookingDetails, bookingDetailsError, isModifying, modificationError } = useSelector(
    (state: RootState) => state.booking
  );
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [passengers, setPassengers] = useState<PassengerInfo[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [contactErrors, setContactErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const booking = bookings.find(b => b.id === bookingId);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (bookingId && !booking) {
      loadBookingDetails();
    } else if (booking) {
      initializeFormData();
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

  const initializeFormData = () => {
    if (!booking) return;
    
    setPassengers([...booking.passengers]);
    // Note: Contact info would need to be stored in booking or fetched separately
    setContactEmail(''); // Would need to get from booking or user profile
    setContactPhone(''); // Would need to get from booking or user profile
  };

  const updatePassenger = (index: number, passenger: PassengerInfo) => {
    const updatedPassengers = [...passengers];
    updatedPassengers[index] = passenger;
    setPassengers(updatedPassengers);
    setHasChanges(true);
    
    // Clear validation errors for this passenger
    const newErrors = { ...validationErrors };
    delete newErrors[index];
    setValidationErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const errors: Record<number, string[]> = {};
    const contactErrs: string[] = [];
    let isValid = true;

    // Validate passengers
    passengers.forEach((passenger, index) => {
      const passengerErrors = bookingService.validatePassengerInfo(passenger);
      if (passengerErrors.length > 0) {
        errors[index] = passengerErrors;
        isValid = false;
      }
    });

    // Validate contact information
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      contactErrs.push('Invalid email address');
      isValid = false;
    }

    if (contactPhone && !/^\+?[\d\s\-\(\)]+$/.test(contactPhone)) {
      contactErrs.push('Invalid phone number format');
      isValid = false;
    }

    setValidationErrors(errors);
    setContactErrors(contactErrs);
    return isValid;
  };

  const handleSaveChanges = async () => {
    if (!validateForm() || !bookingId) return;

    dispatch(startModification());
    try {
      const updateData = {
        passengers,
        ...(contactEmail && { contactEmail }),
        ...(contactPhone && { contactPhone }),
      };

      const updatedBooking = await bookingService.updateBooking(bookingId, updateData);
      dispatch(modificationSuccess(updatedBooking));
      setHasChanges(false);
      
      // Navigate back to booking details
      navigate(`/booking/${bookingId}`);
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  const handleCancel = () => {
    navigate(`/booking/${bookingId}`);
  };

  const canModify = booking && (booking.status === 'confirmed' || booking.status === 'pending') && 
                   new Date(booking.travelDate) > new Date();

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to modify bookings.</p>
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

  if (!canModify) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cannot Modify Booking</h2>
          <p className="text-gray-600 mb-4">
            This booking cannot be modified. It may be cancelled, completed, or the travel date has passed.
          </p>
          <button
            onClick={() => navigate(`/booking/${bookingId}`)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            View Booking Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/booking/${bookingId}`)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 flex items-center"
        >
          ← Back to Booking Details
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Modify Booking</h1>
        <p className="text-gray-600">
          Update passenger information and contact details for your booking.
        </p>
      </div>

      {/* Error Messages */}
      {modificationError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{modificationError}</p>
        </div>
      )}

      {/* Flight Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Flight Details</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              {booking.flightDetails.route[0]?.origin} → {booking.flightDetails.route[booking.flightDetails.route.length - 1]?.destination}
            </p>
            <p className="text-sm text-gray-600">
              {booking.flightDetails.airline} {booking.flightDetails.flightNumber}
            </p>
            <p className="text-sm text-gray-600">
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).format(booking.travelDate)}
            </p>
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
      </div>

      {/* Modification Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-yellow-800 mb-2">Important Notice</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Changes to passenger names must match government-issued ID exactly</li>
          <li>• Some modifications may incur additional fees from the airline</li>
          <li>• Flight details (dates, times, routes) cannot be changed through this interface</li>
          <li>• Contact customer service for flight changes or complex modifications</li>
        </ul>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        
        {contactErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <ul className="text-sm text-red-600 space-y-1">
              {contactErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value);
                setHasChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => {
                setContactPhone(e.target.value);
                setHasChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </div>

      {/* Passenger Forms */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Passenger Information</h2>
      
      {passengers.map((passenger, index) => (
        <PassengerForm
          key={index}
          passenger={passenger}
          passengerIndex={index}
          onUpdate={(updatedPassenger) => updatePassenger(index, updatedPassenger)}
          showRemoveButton={false} // Don't allow removing passengers in modification
          errors={validationErrors[index] || []}
        />
      ))}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-8">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isModifying}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        
        <div className="flex items-center gap-4">
          {hasChanges && (
            <span className="text-sm text-yellow-600">
              You have unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isModifying || !hasChanges}
            className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isModifying ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving Changes...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModification;