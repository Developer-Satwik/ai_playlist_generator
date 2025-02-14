import React, { useState, useEffect } from 'react';
import { getUserConversations, deleteConversation, exportHistory, importHistory, clearHistory } from '../services/conversationService';
import '../styles/ConversationHistory.css';

const ConversationHistory = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const loadedConversations = await getUserConversations();
      setConversations(loadedConversations);
      setError('');
    } catch (err) {
      setError('Failed to load conversations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSort = (event) => {
    setSortBy(event.target.value);
  };

  const handleSelect = (conversation) => {
    setSelectedId(conversation.id);
    if (onSelectConversation) {
      onSelectConversation(conversation);
    }
  };

  const handleDelete = async (id, event) => {
    event.stopPropagation();
    try {
      if (window.confirm('Are you sure you want to delete this conversation?')) {
        await deleteConversation(id);
        await loadConversations();
        if (selectedId === id) {
          setSelectedId(null);
        }
      }
    } catch (err) {
      setError('Failed to delete conversation: ' + err.message);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportHistory();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learning_history_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export history: ' + err.message);
    }
  };

  const handleImport = async (event) => {
    try {
      const file = event.target.files[0];
      if (file) {
        await importHistory(file);
        await loadConversations();
      }
    } catch (err) {
      setError('Failed to import history: ' + err.message);
    }
  };

  const handleClearHistory = async () => {
    try {
      if (window.confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
        await clearHistory();
        await loadConversations();
        setSelectedId(null);
      }
    } catch (err) {
      setError('Failed to clear history: ' + err.message);
    }
  };

  const filteredAndSortedConversations = conversations
    .filter(conv => 
      conv.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.messages?.some(msg => 
        msg.content?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      } else {
        return (a.topic || '').localeCompare(b.topic || '');
      }
    });

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="conversation-history">
      <div className="history-container">
        <div className="history-header">
          <h2>Learning History</h2>
          <div className="history-controls">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
            <select value={sortBy} onChange={handleSort} className="sort-select">
              <option value="date">Sort by Date</option>
              <option value="topic">Sort by Topic</option>
            </select>
          </div>
        </div>

        <div className="history-actions">
          <button onClick={handleExport} className="action-button export">
            <i className="fas fa-download"></i>
            Export History
          </button>
          <label className="action-button import">
            <i className="fas fa-upload"></i>
            Import History
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={handleClearHistory} className="action-button clear">
            <i className="fas fa-trash"></i>
            Clear History
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="conversations-list">
          {loading ? (
            <div className="loading-state">Loading conversations...</div>
          ) : filteredAndSortedConversations.length === 0 ? (
            <div className="no-conversations">
              <p>No conversations found</p>
            </div>
          ) : (
            filteredAndSortedConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`conversation-item ${selectedId === conversation.id ? 'selected' : ''}`}
                onClick={() => handleSelect(conversation)}
              >
                <div className="conversation-content">
                  <h3 className="conversation-topic">{conversation.topic || 'Untitled Conversation'}</h3>
                  <p className="conversation-date">
                    {formatDate(conversation.updatedAt || conversation.createdAt)}
                  </p>
                  <p className="conversation-preview">
                    {conversation.messages?.length || 0} messages
                  </p>
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => handleDelete(conversation.id, e)}
                  title="Delete conversation"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHistory; 