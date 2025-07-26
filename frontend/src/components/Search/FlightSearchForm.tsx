import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { startSearch, searchSuccess, searchError } from '../../store/slices/searchSlice';
import { addNotification } from '../../store/slices/uiSlice';
import api from '../../services/api';

interface FlightSearchResponse {
  success: boolean;
  flights: any[];
  totalResults: number;
  searchCriteria: any;
  message?: string;
}

interface FlightSearchFormProps {
  onSearchComplete?: () => void;
}

const FlightSearchForm: React.FC<FlightSearchFormProps> = ({ onSearchComplete }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    passengers: {
      adults: 1,
      children: 0,
      infants: 0,
    },
    cabinClass: 'economy' as const,
    tripType: 'roundtrip' as 'roundtrip' | 'oneway',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePassengerChange = (type: 'adults' | 'children' | 'infants', value: number) => {
    setFormData(prev => ({
      ...prev,
      passengers: {
        ...prev.passengers,
        [type]: Math.max(0, value),
      },
    }));
  };

  const handleTripTypeChange = (type: 'roundtrip' | 'oneway') => {
    setFormData(prev => ({
      ...prev,
      tripType: type,
      returnDate: type === 'oneway' ? '' : prev.returnDate,
    }));
  };

  const validateForm = () => {
    if (!formData.origin.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please enter departure city',
      }));
      return false;
    }

    if (!formData.destination.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please enter destination city',
      }));
      return false;
    }

    if (!formData.departureDate) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please select departure date',
      }));
      return false;
    }

    if (formData.tripType === 'roundtrip' && !formData.returnDate) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please select return date for round trip',
      }));
      return false;
    }

    if (formData.passengers.adults === 0) {
      dispatch(addNotification({
        type: 'error',
        message: 'At least one adult passenger is required',
      }));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const searchCriteriaForAPI = {
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      departureDate: formData.departureDate,
      returnDate: formData.tripType === 'roundtrip' ? formData.returnDate : undefined,
      passengers: formData.passengers,
      cabinClass: formData.cabinClass,
      flexible: false,
    };

    const searchCriteriaForStore = {
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      departureDate: new Date(formData.departureDate),
      returnDate: formData.tripType === 'roundtrip' && formData.returnDate ? new Date(formData.returnDate) : undefined,
      passengers: formData.passengers,
      cabinClass: formData.cabinClass,
      flexible: false,
    };

    dispatch(startSearch(searchCriteriaForStore));

    try {
      console.log('Making API call with criteria:', searchCriteriaForAPI);
      const response = await api.searchFlights(searchCriteriaForAPI) as FlightSearchResponse;
      console.log('API response received:', response);
      
      if (response.success) {
        const flightSearch = {
          id: `search_${Date.now()}`,
          searchCriteria: searchCriteriaForStore,
          results: response.flights || [],
          status: 'completed' as const,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        };

        dispatch(searchSuccess(flightSearch));
        dispatch(addNotification({
          type: 'success',
          message: `Found ${response.flights?.length || 0} flights`,
        }));

        if (onSearchComplete) {
          onSearchComplete();
        }
      } else {
        throw new Error(response.message || 'Search failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to search flights. Please try again.';
      dispatch(searchError(errorMessage));
      dispatch(addNotification({
        type: 'error',
        message: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">Search Flights</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trip Type */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => handleTripTypeChange('roundtrip')}
            className={`px-4 py-2 rounded-lg font-medium ${
              formData.tripType === 'roundtrip'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Round Trip
          </button>
          <button
            type="button"
            onClick={() => handleTripTypeChange('oneway')}
            className={`px-4 py-2 rounded-lg font-medium ${
              formData.tripType === 'oneway'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            One Way
          </button>
        </div>

        {/* Origin and Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="text"
              id="origin"
              name="origin"
              value={formData.origin}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Departure city or airport"
              required
            />
          </div>
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Destination city or airport"
              required
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700 mb-1">
              Departure Date
            </label>
            <input
              type="date"
              id="departureDate"
              name="departureDate"
              value={formData.departureDate}
              onChange={handleInputChange}
              min={today}
              className="input-field"
              required
            />
          </div>
          {formData.tripType === 'roundtrip' && (
            <div>
              <label htmlFor="returnDate" className="block text-sm font-medium text-gray-700 mb-1">
                Return Date
              </label>
              <input
                type="date"
                id="returnDate"
                name="returnDate"
                value={formData.returnDate}
                onChange={handleInputChange}
                min={formData.departureDate || today}
                className="input-field"
                required
              />
            </div>
          )}
        </div>

        {/* Passengers and Cabin Class */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passengers
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Adults</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePassengerChange('adults', formData.passengers.adults - 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    disabled={formData.passengers.adults <= 1}
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{formData.passengers.adults}</span>
                  <button
                    type="button"
                    onClick={() => handlePassengerChange('adults', formData.passengers.adults + 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Children</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePassengerChange('children', formData.passengers.children - 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    disabled={formData.passengers.children <= 0}
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{formData.passengers.children}</span>
                  <button
                    type="button"
                    onClick={() => handlePassengerChange('children', formData.passengers.children + 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="cabinClass" className="block text-sm font-medium text-gray-700 mb-1">
              Cabin Class
            </label>
            <select
              id="cabinClass"
              name="cabinClass"
              value={formData.cabinClass}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="economy">Economy</option>
              <option value="premium">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First Class</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching Flights...' : 'Search Flights'}
        </button>
      </form>
    </div>
  );
};

export default FlightSearchForm;