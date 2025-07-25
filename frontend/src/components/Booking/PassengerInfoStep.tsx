import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { updatePassengers, updateContactInfo, setBookingStep } from '../../store/slices/bookingSlice';
import { PassengerInfo } from '../../store/slices/bookingSlice';
import PassengerForm from './PassengerForm';
import bookingService from '../../services/bookingService';

const PassengerInfoStep: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedFlight, formData } = useSelector((state: RootState) => state.booking);
  const [passengers, setPassengers] = useState<PassengerInfo[]>(formData.passengers);
  const [contactEmail, setContactEmail] = useState(formData.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(formData.contactPhone || '');
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [contactErrors, setContactErrors] = useState<string[]>([]);

  useEffect(() => {
    // Initialize with at least one passenger if none exist
    if (passengers.length === 0 && selectedFlight) {
      const passengerCount = 1; // Default to 1 passenger
      const initialPassengers: PassengerInfo[] = Array.from({ length: passengerCount }, () => ({
        firstName: '',
        lastName: '',
        dateOfBirth: new Date(),
      }));
      setPassengers(initialPassengers);
    }
  }, [selectedFlight, passengers.length]);

  const updatePassenger = (index: number, passenger: PassengerInfo) => {
    const updatedPassengers = [...passengers];
    updatedPassengers[index] = passenger;
    setPassengers(updatedPassengers);
    
    // Clear validation errors for this passenger
    const newErrors = { ...validationErrors };
    delete newErrors[index];
    setValidationErrors(newErrors);
  };

  const addPassenger = () => {
    const newPassenger: PassengerInfo = {
      firstName: '',
      lastName: '',
      dateOfBirth: new Date(),
    };
    setPassengers([...passengers, newPassenger]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      const updatedPassengers = passengers.filter((_, i) => i !== index);
      setPassengers(updatedPassengers);
      
      // Remove validation errors for this passenger and adjust indices
      const newErrors: Record<number, string[]> = {};
      Object.entries(validationErrors).forEach(([key, value]) => {
        const passengerIndex = parseInt(key);
        if (passengerIndex < index) {
          newErrors[passengerIndex] = value;
        } else if (passengerIndex > index) {
          newErrors[passengerIndex - 1] = value;
        }
      });
      setValidationErrors(newErrors);
    }
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
    if (!contactEmail.trim()) {
      contactErrs.push('Contact email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
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

  const handleContinue = () => {
    if (validateForm()) {
      // Update Redux store
      dispatch(updatePassengers(passengers));
      dispatch(updateContactInfo({ email: contactEmail, phone: contactPhone }));
      dispatch(setBookingStep('payment'));
    }
  };

  const handleBack = () => {
    // Save current data to Redux store
    dispatch(updatePassengers(passengers));
    dispatch(updateContactInfo({ email: contactEmail, phone: contactPhone }));
    // Navigate back to search results or previous step
    window.history.back();
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center text-blue-600">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm font-medium">Passenger Info</span>
            </div>
          </div>
          <div className="flex items-center text-gray-400">
            <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="ml-2 text-sm font-medium">Payment</span>
          </div>
          <div className="flex items-center text-gray-400">
            <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-medium">
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
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }}></div>
        </div>
      </div>

      {/* Flight Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Selected Flight</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              {selectedFlight.route[0]?.origin} → {selectedFlight.route[selectedFlight.route.length - 1]?.destination}
            </p>
            <p className="text-sm text-gray-600">
              {selectedFlight.airline} {selectedFlight.flightNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              ${selectedFlight.pricing.totalPrice.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              {selectedFlight.duration} min • {selectedFlight.layovers} stops
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Passenger Information</h2>

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
              Email Address *
            </label>
            <input
              type="email"
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email address"
              required
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
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </div>

      {/* Passenger Forms */}
      {passengers.map((passenger, index) => (
        <PassengerForm
          key={index}
          passenger={passenger}
          passengerIndex={index}
          onUpdate={(updatedPassenger) => updatePassenger(index, updatedPassenger)}
          onRemove={() => removePassenger(index)}
          showRemoveButton={passengers.length > 1}
          errors={validationErrors[index] || []}
        />
      ))}

      {/* Add Passenger Button */}
      {passengers.length < 9 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={addPassenger}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + Add Another Passenger
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
};

export default PassengerInfoStep;