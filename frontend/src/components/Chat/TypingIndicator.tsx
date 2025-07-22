import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex max-w-xs lg:max-w-md">
      {/* Avatar */}
      <div className="flex-shrink-0 mr-2">
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-medium">
          AI
        </div>
      </div>

      {/* Typing bubble */}
      <div className="bg-gray-100 rounded-lg rounded-bl-sm px-4 py-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;