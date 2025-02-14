import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Survey from './Survey';
import Playlist from './Playlist';
import { addConversation, addInteraction } from '../services/conversationService';
import ConversationHistory from './ConversationHistory';
import '../styles/Chat.css';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

const COMMANDS = [
  '/create-playlist',
  '/help',
  '/clear',
  '/share',
  '/settings'
];

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toString() !== 'Invalid Date' 
      ? date.toLocaleTimeString()
      : '';
  } catch (error) {
    return '';
  }
};

function Chat({ onStartNewChat }) {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: "Hi! I'm your Learning Assistant. I can help you find learning resources and create personalized playlists. Type '/' to see available commands or ask me anything!",
      timestamp: new Date().toISOString()
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
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(-1);
  const [showSidebar, setShowSidebar] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

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
          content: "Hi! I'm your Learning Assistant. I can help you find learning resources and create personalized playlists. Type '/' to see available commands or ask me anything!",
          timestamp: new Date().toISOString()
        }]);
        setInputValue('');
        setIsGeneratingPlaylist(false);
        setCurrentTopic('');
        setConversationContext([]);
        setShowCommands(false);
      });
    }
  }, [onStartNewChat]);

  useEffect(() => {
    // Load conversations when component mounts
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      // This is a placeholder - implement actual conversation loading logic
      const loadedConversations = []; // Replace with actual API call
      setConversations(loadedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([{
      type: 'bot',
      content: "Hi! I'm your Learning Assistant. I can help you find learning resources and create personalized playlists. Type '/' to see available commands or ask me anything!",
      timestamp: new Date().toISOString()
    }]);
    setCurrentTopic('');
    setCurrentConversationId(null);
    setSelectedConversation(null);
    setConversationContext([]);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

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
          ),
          timestamp: new Date().toISOString()
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

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.startsWith('/')) {
      const searchTerm = value.slice(1).toLowerCase();
      const filtered = COMMANDS.filter(cmd => 
        cmd.toLowerCase().includes(searchTerm)
      );
      setFilteredCommands(filtered);
      setShowCommands(filtered.length > 0);
      setSelectedCommandIndex(-1);
    } else {
      setShowCommands(false);
      setFilteredCommands([]);
      setSelectedCommandIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (showCommands) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev > 0 ? prev - 1 : prev
          );
          break;
        case 'Tab':
        case 'Enter':
          if (selectedCommandIndex >= 0) {
            e.preventDefault();
            handleCommandClick(filteredCommands[selectedCommandIndex]);
          }
          break;
        case 'Escape':
          setShowCommands(false);
          setSelectedCommandIndex(-1);
          break;
        default:
          break;
      }
    }
  };

  const handleCommandClick = (command) => {
    setInputValue(command + ' ');
    setShowCommands(false);
    setSelectedCommandIndex(-1);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    try {
      let conversationId = currentConversationId;

      // Create a new conversation if one doesn't exist
      if (!conversationId) {
        const topic = currentTopic || 'Untitled Conversation';
        try {
          const newConversation = await addConversation(topic, {
            interactions: []
          });
          conversationId = newConversation.id;
          setCurrentConversationId(conversationId);
        } catch (error) {
          console.error('Error creating conversation:', error);
          setMessages(prev => [...prev, {
            type: 'bot',
            content: "Error creating conversation. Please try again.",
            timestamp: new Date().toISOString()
          }]);
          return;
        }
      }

      const userMessage = {
        type: 'user',
        content: inputValue.trim(),
        timestamp: new Date().toISOString()
      };

      // Clear input and hide commands
      setInputValue('');
      setShowCommands(false);

      // Update UI with user message
      setMessages(prev => [...prev, userMessage]);

      // Show loading state
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
        </div>,
        timestamp: new Date().toISOString()
      }]);

      try {
        // Save the interaction
        await addInteraction(conversationId, userMessage);

        // Process the message
        if (userMessage.content.startsWith('/')) {
          const [command, ...args] = userMessage.content.split(' ');
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
                          content: <Playlist items={playlist} />,
                          timestamp: new Date().toISOString()
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
                          ),
                          timestamp: new Date().toISOString()
                        }
                      ]);
                      setIsGeneratingPlaylist(false);
                      setCurrentTopic('');
                    }}
                  />,
                  timestamp: new Date().toISOString()
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
                content: "Chat history cleared. How can I help you?",
                timestamp: new Date().toISOString()
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

          const result = await chat.sendMessage(userMessage.content);
          const response = await result.response;
          const text = response.text();
          
          await typeText(text);

          setConversationContext(prev => [...prev, 
            { role: 'user', parts: userMessage.content },
            { role: 'model', parts: text }
          ]);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        setMessages(prev => prev.filter(msg => msg.timestamp !== userMessage.timestamp));
        setMessages(prev => [...prev, {
          type: 'bot',
          content: "Sorry, there was an error processing your message. Please try again.",
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: "An error occurred. Please try again later.",
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
    }
  };

  const handleTopicChange = (event) => {
    setCurrentTopic(event.target.value);
  };

  const handleSelectConversation = (conversation) => {
    setCurrentConversationId(conversation.id);
    setCurrentTopic(conversation.topic);
    setMessages(conversation.data.interactions);
    setShowHistory(false);
  };

  const toggleHistory = () => {
    setShowHistory(prev => !prev);
  };

  return (
    <div className="chat-container">
      <div className="chat-main">
        <div className="messages-container" ref={messagesContainerRef}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.type === 'user' ? 'user' : 'ai'}`}
            >
              <div className="message-content">{message.content}</div>
              {message.timestamp && (
                <div className="message-timestamp">
                  {formatTimestamp(message.timestamp)}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              handleKeyDown(e);
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message or use '/' for commands..."
            rows={1}
          />
          {showCommands && (
            <div className="commands-dropdown">
              {filteredCommands.map((command, index) => (
                <div
                  key={command}
                  className={`command-option ${index === selectedCommandIndex ? 'selected' : ''}`}
                  onClick={() => handleCommandClick(command)}
                >
                  {command}
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;