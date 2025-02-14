import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Survey from './Survey';
import Playlist from './Playlist';
import '../styles/Chat.css';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

const COMMANDS = [
  '/create-playlist',
  '/help',
  '/clear',
  '/share',
  '/settings'
];

function Chat({ onStartNewChat }) {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: "Hi! I'm your Learning Assistant. I can help you find learning resources and create personalized playlists. Type '/' to see available commands or ask me anything!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  const [conversationContext, setConversationContext] = useState([]);
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const stopGeneratingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const scrollToBottom = (force = false) => {
    if (shouldAutoScrollRef.current || force) {
      const behavior = force ? 'smooth' : 'auto';
      const container = messagesContainerRef.current;
      if (container) {
        const scrollOptions = {
          top: container.scrollHeight,
          behavior
        };
        container.scrollTo(scrollOptions);
      }
    }
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    
    shouldAutoScrollRef.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
      return () => messagesContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (onStartNewChat) {
      onStartNewChat(() => {
        setMessages([{
          type: 'bot',
          content: "Hi! I'm your Learning Assistant. I can help you find learning resources and create personalized playlists. Type '/' to see available commands or ask me anything!"
        }]);
        setInputValue('');
        setIsGeneratingPlaylist(false);
        setCurrentTopic('');
        setConversationContext([]);
        setShowCommands(false);
      });
    }
  }, [onStartNewChat]);

  const stopGeneration = () => {
    stopGeneratingRef.current = true;
  };

  const typeText = async (text) => {
    let displayText = '';
    const chars = text.split('');
    const typingSpeed = 10;
    stopGeneratingRef.current = false;
    setIsGenerating(true);
    
    for (let i = 0; i < chars.length; i++) {
      if (stopGeneratingRef.current) {
        setIsGenerating(false);
        return displayText;
      }

      displayText += chars[i];
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          type: 'bot',
          content: (
            <div className="generating-text">
              {displayText.split('\n').map((line, index) => (
                <div key={index} className="text-line">
                  {line}
                  {index < displayText.split('\n').length - 1 && <br />}
                </div>
              ))}
              <span className="text-cursor"></span>
            </div>
          )
        }
      ]);

      // Use requestAnimationFrame for smoother scrolling
      if (shouldAutoScrollRef.current) {
        requestAnimationFrame(scrollToBottom);
      }
      
      await new Promise(resolve => setTimeout(resolve, typingSpeed));
    }
    
    setIsGenerating(false);
    return text;
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
    }
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setShowCommands(false);

    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage
    }]);

    setIsLoading(true);
    setMessages(prev => [...prev, {
      type: 'bot',
      content: <div className="loading-state">
        <div className="thinking">
          <span>AI is thinking</span>
          <div className="thinking-dots">
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
          </div>
        </div>
      </div>
    }]);

    try {
      if (userMessage.startsWith('/')) {
        const [command, ...args] = userMessage.split(' ');
        const topic = args.join(' ');

        switch(command) {
          case '/create-playlist':
            if (topic) {
              setCurrentTopic(topic);
              setMessages(prev => [...prev.slice(0, -1), {
                type: 'bot',
                content: <Survey 
                  topic={topic} 
                  conversationContext={conversationContext}
                  onComplete={(playlist, roadmap) => {
                    setMessages(prev => [
                      ...prev,
                      {
                        type: 'bot',
                        content: <Playlist items={playlist} />
                      },
                      {
                        type: 'bot',
                        content: (
                          <div className="roadmap">
                            <h3>Your Learning Roadmap for {topic}</h3>
                            <div className="roadmap-content">
                              {roadmap.split('\n').map((line, index) => (
                                <div key={index} className="roadmap-line">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    ]);
                    setIsGeneratingPlaylist(false);
                    setCurrentTopic('');
                  }}
                />
              }]);
            } else {
              setIsGeneratingPlaylist(true);
              const text = "What topic would you like to learn about?";
              await typeText(text);
            }
            break;
          case '/help':
            const helpText = "Available commands:\n" +
              "/create-playlist [topic] - Create a learning playlist for a topic\n" +
              "/clear - Clear chat history\n" +
              "/share - Share your last playlist\n" +
              "/settings - Adjust your preferences";
            await typeText(helpText);
            break;
          case '/clear':
            setMessages([{
              type: 'bot',
              content: "Chat history cleared. How can I help you?"
            }]);
            break;
          default:
            const errorText = "Unknown command. Type /help to see available commands.";
            await typeText(errorText);
        }
      } else {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const chat = model.startChat({
          history: conversationContext,
        });

        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();
        
        await typeText(text);

        setConversationContext(prev => [...prev, 
          { role: 'user', parts: userMessage },
          { role: 'model', parts: text }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorText = "I apologize, but I encountered an error. Please try again.";
      await typeText(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.startsWith('/')) {
      const search = value.slice(1).toLowerCase();
      const filtered = COMMANDS.filter(cmd => 
        cmd.toLowerCase().startsWith(search)
      );
      setFilteredCommands(filtered);
      setShowCommands(filtered.length > 0);
    } else {
      setShowCommands(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === '/') {
      setShowCommands(true);
      setFilteredCommands(COMMANDS);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Tab' && showCommands) {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        handleCommandClick(filteredCommands[0]);
      }
    } else if (e.key === 'Escape' && showCommands) {
      setShowCommands(false);
    }
  };

  const handleCommandClick = (command) => {
    setInputValue(command);
    setShowCommands(false);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-container">
      <div 
        className="messages" 
        ref={messagesContainerRef}
      >
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {showScrollButton && (
        <button 
          className="scroll-bottom-button"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to bottom"
        >
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            width="20"
            height="20"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </button>
      )}
      
      <div className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            className="chat-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isGeneratingPlaylist 
              ? "Enter the topic you want to learn..." 
              : "Type a message or / for commands"}
            ref={inputRef}
            disabled={isLoading}
          />
          {isGenerating ? (
            <button 
              onClick={stopGeneration}
              className="stop-button"
              aria-label="Stop generating"
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
                width="18"
                height="18"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className="send-button"
              disabled={isLoading}
              aria-label="Send message"
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
                width="18"
                height="18"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          )}
        </div>
        {showCommands && (
          <div className="command-suggestions">
            {filteredCommands.map((cmd) => (
              <div
                key={cmd}
                className="command-item"
                onClick={() => handleCommandClick(cmd)}
              >
                {cmd}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;