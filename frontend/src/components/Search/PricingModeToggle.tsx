import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setPricingMode, PricingMode } from '../../store/slices/searchSlice';

const PricingModeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const { pricingMode } = useSelector((state: RootState) => state.search);

  const handleToggle = (mode: PricingMode) => {
    dispatch(setPricingMode(mode));
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleToggle('cash')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          pricingMode === 'cash'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        💵 Cash
      </button>
      <button
        onClick={() => handleToggle('points')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          pricingMode === 'points'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        ⭐ Points
      </button>
    </div>
  );
};

export default PricingModeToggle;