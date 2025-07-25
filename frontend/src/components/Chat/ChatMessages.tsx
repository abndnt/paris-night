import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Message } from '../../store/slices/chatSlice';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface ChatMessagesProps {
  messages: Message[];
  sessionId: string;
  isMobile?: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, sessionId, isMobile }) => {
  const { assistantTyping } = useSelector((state: RootState) => state.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, assistantTyping]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const shouldShowTimestamp = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const timeDiff = currentMessage.timestamp - previousMessage.timestamp;
    const fiveMinutes = 5 * 60 * 1000;
    
    return timeDiff > fiveMinutes || currentMessage.sender !== previousMessage.sender;
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.524A11.956 11.956 0 012.69 18.186c.423-.95.893-1.902 1.405-2.852A8.002 8.002 0 0121 12z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start your flight search
          </h3>
          <p className="text-gray-600">
            Ask me about flights, destinations, or travel planning. I'm here to help you find the best deals using your points and miles!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ scrollBehavior: 'smooth' }}
    >
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : undefined;
        const showTimestamp = shouldShowTimestamp(message, previousMessage);
        
        return (
          <div key={message.id}>
            {showTimestamp && (
              <div className="flex justify-center mb-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            )}
            <MessageBubble message={message} />
          </div>
        );
      })}
      
      {assistantTyping && (
        <div className="flex justify-start">
          <TypingIndicator />
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;