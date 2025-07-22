import React from 'react';
import { ChatSession } from '../../store/slices/chatSlice';

interface ChatHeaderProps {
  session: ChatSession;
  isConnected: boolean;
  connectionError: string | null;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  session, 
  isConnected, 
  connectionError,
  isMobile = false,
  onToggleSidebar,
  showSidebar = false
}) => {
  const getConnectionStatus = () => {
    if (connectionError) {
      return (
        <div className="flex items-center text-red-600">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <span className="text-sm">Connection Error</span>
        </div>
      );
    }
    
    if (isConnected) {
      return (
        <div className="flex items-center text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm">Connected</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-yellow-600">
        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
        <span className="text-sm">Connecting...</span>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          {isMobile && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showSidebar ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
          
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate">
              {session.title}
            </h2>
            <p className="text-xs md:text-sm text-gray-500">
              {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          {getConnectionStatus()}
          
          {connectionError && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs md:text-sm text-primary-600 hover:text-primary-800 underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;