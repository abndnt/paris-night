import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setUserTyping } from '../../store/slices/chatSlice';
import chatWebSocketService from '../../services/chatWebSocketService';

interface ChatInputProps {
  sessionId: string;
  disabled?: boolean;
  isMobile?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ sessionId, disabled = false, isMobile }) => {
  const dispatch = useDispatch();
  const { isTyping } = useSelector((state: RootState) => state.chat);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Auto-focus the input when component mounts
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  useEffect(() => {
    // Auto-resize textarea based on content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      dispatch(setUserTyping(true));
      chatWebSocketService.sendTyping(sessionId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      dispatch(setUserTyping(false));
      chatWebSocketService.sendTyping(sessionId, false);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Clear typing indicator
      dispatch(setUserTyping(false));
      chatWebSocketService.sendTyping(sessionId, false);
      
      // Send message
      chatWebSocketService.sendMessage({
        content: trimmedMessage,
        sender: 'user',
        sessionId,
      });

      // Clear input
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const placeholderText = disabled 
    ? 'Connecting...' 
    : 'Ask about flights, destinations, or travel planning...';

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={disabled || isSubmitting}
            rows={1}
            className={`w-full resize-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 ${
              disabled || isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            style={{ minHeight: '40px' }}
          />
          
          {/* Character count (optional) */}
          {message.length > 500 && (
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {message.length}/1000
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!message.trim() || disabled || isSubmitting}
          aria-label={isSubmitting ? "Sending..." : "Send message"}
          className={`flex-shrink-0 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
            (!message.trim() || disabled || isSubmitting)
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          {isSubmitting ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>

      {/* Typing indicator for user */}
      {isTyping && (
        <div className="mt-2 text-xs text-gray-500">
          You are typing...
        </div>
      )}
    </div>
  );
};

export default ChatInput;