import React, { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (dateRange: { startDate: string; endDate: string }) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Predefined date ranges
  const dateRanges = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'This month', days: 'month' },
    { label: 'Last month', days: 'lastMonth' },
    { label: 'This year', days: 'year' },
  ];

  // Apply date range and close dropdown
  const applyDateRange = () => {
    onChange({ startDate: localStartDate, endDate: localEndDate });
    setIsOpen(false);
  };

  // Handle predefined range selection
  const handleRangeSelect = (range: { label: string; days: number | string }) => {
    const end = new Date();
    let start = new Date();

    if (typeof range.days === 'number') {
      // Simple day offset
      start.setDate(end.getDate() - range.days);
    } else if (range.days === 'month') {
      // This month
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (range.days === 'lastMonth') {
      // Last month
      end.setDate(0); // Last day of previous month
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (range.days === 'year') {
      // This year
      start = new Date(end.getFullYear(), 0, 1);
    }

    const newStartDate = start.toISOString().split('T')[0];
    const newEndDate = end.toISOString().split('T')[0];
    
    setLocalStartDate(newStartDate);
    setLocalEndDate(newEndDate);
    onChange({ startDate: newStartDate, endDate: newEndDate });
    setIsOpen(false);
  };

  // Format date for display
  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center border rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 text-sm"
      >
        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <span>
          {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
        </span>
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white border rounded-md shadow-lg z-10 w-72">
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-800 mr-3"
              >
                Cancel
              </button>
              <button
                onClick={applyDateRange}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                Apply
              </button>
            </div>
          </div>
          
          <div className="border-t px-4 py-2">
            <h4 className="text-xs font-medium text-gray-500 mb-2">PRESETS</h4>
            <div className="grid grid-cols-2 gap-2">
              {dateRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => handleRangeSelect(range)}
                  className="text-left text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;