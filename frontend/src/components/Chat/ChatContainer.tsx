import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { createSession, setCurrentSession } from '../../store/slices/chatSlice';
import { closeMobileMenu } from '../../store/slices/uiSlice';
import chatWebSocketService from '../../services/chatWebSocketService';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';

interface ChatContainerProps {
  className?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { 
    sessions, 
    currentSessionId, 
    isConnected, 
    connectionError 
  } = useSelector((state: RootState) => state.chat);
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const { mobile } = useSelector((state: RootState) => state.ui);
  
  const [showSidebar, setShowSidebar] = useState(!mobile.isMobile);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Touch gestures for mobile navigation
  const chatAreaRef = useTouchGestures<HTMLDivElement>({
    onSwipeRight: () => {
      if (mobile.isMobile && !showSidebar) {
        setShowSidebar(true);
      }
    },
    onSwipeLeft: () => {
      if (mobile.isMobile && showSidebar) {
        setShowSidebar(false);
      }
    },
  });

  useEffect(() => {
    if (isAuthenticated && token) {
      chatWebSocketService.connect(token);
    }

    return () => {
      chatWebSocketService.disconnect();
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Create initial session if none exists
    if (sessions.length === 0 && isAuthenticated) {
      const sessionId = `session_${Date.now()}`;
      dispatch(createSession({
        id: sessionId,
        title: 'New Chat',
      }));
    }
  }, [sessions.length, isAuthenticated, dispatch]);

  // Handle mobile sidebar visibility
  useEffect(() => {
    if (!mobile.isMobile) {
      setShowSidebar(true);
    } else {
      setShowSidebar(false);
    }
  }, [mobile.isMobile]);

  const handleNewChat = () => {
    const sessionId = `session_${Date.now()}`;
    dispatch(createSession({
      id: sessionId,
      title: 'New Chat',
    }));
  };

  const handleSessionSelect = (sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
    chatWebSocketService.joinSession(sessionId);
    
    // Close sidebar on mobile after selection
    if (mobile.isMobile) {
      setShowSidebar(false);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  if (!isAuthenticated) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Please log in to start chatting
          </h3>
          <p className="text-gray-600">
            You need to be logged in to use the chat feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full bg-white rounded-lg shadow-lg overflow-hidden relative ${className}`} ref={containerRef}>
      {/* Mobile Sidebar Overlay */}
      {mobile.isMobile && showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${mobile.isMobile 
          ? `fixed left-0 top-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out ${
              showSidebar ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'w-80 relative'
        } 
        border-r border-gray-200 flex flex-col bg-white
      `}>
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          isMobile={mobile.isMobile}
          onClose={() => setShowSidebar(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0" ref={chatAreaRef}>
        {currentSession ? (
          <>
            <ChatHeader
              session={currentSession}
              isConnected={isConnected}
              connectionError={connectionError}
              isMobile={mobile.isMobile}
              onToggleSidebar={toggleSidebar}
              showSidebar={showSidebar}
            />
            <div className="flex-1 flex flex-col min-h-0">
              <ChatMessages
                messages={currentSession.messages}
                sessionId={currentSession.id}
                isMobile={mobile.isMobile}
              />
              <ChatInput
                sessionId={currentSession.id}
                disabled={!isConnected}
                isMobile={mobile.isMobile}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to Flight Search Chat
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Start a new conversation to search for flights and get personalized recommendations.
              </p>
              <button
                onClick={handleNewChat}
                className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;