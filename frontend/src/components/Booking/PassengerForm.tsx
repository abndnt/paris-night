import React, { useState, useEffect } from 'react';
import { PassengerInfo } from '../../store/slices/bookingSlice';

interface PassengerFormProps {
  passenger: PassengerInfo;
  passengerIndex: number;
  onUpdate: (passenger: PassengerInfo) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  errors?: string[];
}

const PassengerForm: React.FC<PassengerFormProps> = ({
  passenger,
  passengerIndex,
  onUpdate,
  onRemove,
  showRemoveButton = false,
  errors = [],
}) => {
  const [formData, setFormData] = useState<PassengerInfo>(passenger);

  useEffect(() => {
    setFormData(passenger);
  }, [passenger]);

  const handleChange = (field: keyof PassengerInfo, value: any) => {
    const updatedPassenger = { ...formData, [field]: value };
    setFormData(updatedPassenger);
    onUpdate(updatedPassenger);
  };

  const handleSpecialRequestsChange = (index: number, value: string) => {
    const requests = [...(formData.specialRequests || [])];
    if (value.trim()) {
      requests[index] = value;
    } else {
      requests.splice(index, 1);
    }
    handleChange('specialRequests', requests);
  };

  const addSpecialRequest = () => {
    const requests = [...(formData.specialRequests || []), ''];
    handleChange('specialRequests', requests);
  };

  const removeSpecialRequest = (index: number) => {
    const requests = [...(formData.specialRequests || [])];
    requests.splice(index, 1);
    handleChange('specialRequests', requests);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Passenger {passengerIndex + 1}
        </h3>
        {showRemoveButton && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Remove Passenger
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <ul className="text-sm text-red-600 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label htmlFor={`firstName-${passengerIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            id={`firstName-${passengerIndex}`}
            value={formData.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter first name"
            required
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor={`lastName-${passengerIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id={`lastName-${passengerIndex}`}
            value={formData.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter last name"
            required
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor={`dateOfBirth-${passengerIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth *
          </label>
          <input
            type="date"
            id={`dateOfBirth-${passengerIndex}`}
            value={formData.dateOfBirth && !isNaN(new Date(formData.dateOfBirth).getTime()) 
              ? new Date(formData.dateOfBirth).toISOString().split('T')[0] 
              : ''}
            onChange={(e) => handleChange('dateOfBirth', e.target.value ? new Date(e.target.value) : new Date())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Passport Number */}
        <div>
          <label htmlFor={`passportNumber-${passengerIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            Passport Number
          </label>
          <input
            type="text"
            id={`passportNumber-${passengerIndex}`}
            value={formData.passportNumber || ''}
            onChange={(e) => handleChange('passportNumber', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter passport number"
          />
        </div>

        {/* Known Traveler Number */}
        <div>
          <label htmlFor={`ktn-${passengerIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            Known Traveler Number (TSA PreCheck)
          </label>
          <input
            type="text"
            id={`ktn-${passengerIndex}`}
            value={formData.knownTravelerNumber || ''}
            onChange={(e) => handleChange('knownTravelerNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter KTN number"
          />
        </div>

        {/* Seat Preference */}
        <div>
          <label htmlFor={`seatPreference-${passengerIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            Seat Preference
          </label>
          <select
            id={`seatPreference-${passengerIndex}`}
            value={formData.seatPreference || ''}
            onChange={(e) => handleChange('seatPreference', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">No preference</option>
            <option value="aisle">Aisle</option>
            <option value="window">Window</option>
            <option value="middle">Middle</option>
          </select>
        </div>

        {/* Meal Preference */}
        <div className="md:col-span-2">
          <label htmlFor={`mealPreference-${passengerIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            Meal Preference
          </label>
          <select
            id={`mealPreference-${passengerIndex}`}
            value={formData.mealPreference || ''}
            onChange={(e) => handleChange('mealPreference', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Standard meal</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="kosher">Kosher</option>
            <option value="halal">Halal</option>
            <option value="gluten-free">Gluten-free</option>
            <option value="diabetic">Diabetic</option>
            <option value="low-sodium">Low sodium</option>
            <option value="child">Child meal</option>
          </select>
        </div>
      </div>

      {/* Special Requests */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Special Requests
        </label>
        {(formData.specialRequests || []).map((request, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={request}
              onChange={(e) => handleSpecialRequestsChange(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter special request"
            />
            <button
              type="button"
              onClick={() => removeSpecialRequest(index)}
              className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
        {(!formData.specialRequests || formData.specialRequests.length < 5) && (
          <button
            type="button"
            onClick={addSpecialRequest}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Add Special Request
          </button>
        )}
      </div>
    </div>
  );
};

export default PassengerForm;