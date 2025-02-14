import React, { useState, useEffect } from 'react';
import { 
  getConversations, 
  deleteConversation, 
  exportHistory, 
  importHistory,
  clearHistory 
} from '../services/conversationService';
import '../styles/ConversationHistory.css';

const ConversationHistory = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'topic'
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    const loadedConversations = getConversations();
    setConversations(loadedConversations);
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
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(id);
      loadConversations();
      if (selectedId === id) {
        setSelectedId(null);
      }
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
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export conversation history');
    }
  };

  const handleImport = async (event) => {
    try {
      const file = event.target.files[0];
      if (file) {
        await importHistory(file);
        loadConversations();
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import conversation history');
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
      await clearHistory();
      loadConversations();
      setSelectedId(null);
    }
  };

  const filteredAndSortedConversations = conversations
    .filter(conv => 
      conv.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.data.interactions.some(int => 
        int.content?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else {
        return a.topic.localeCompare(b.topic);
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
          Export History
        </button>
        <label className="action-button import">
          Import History
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
        <button onClick={handleClearHistory} className="action-button clear">
          Clear History
        </button>
      </div>

      <div className="conversations-list">
        {filteredAndSortedConversations.length === 0 ? (
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
                <h3 className="conversation-topic">{conversation.topic}</h3>
                <p className="conversation-date">
                  {formatDate(conversation.timestamp)}
                </p>
                <p className="conversation-preview">
                  {conversation.data.interactions.length} interactions
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
  );
};

export default ConversationHistory; 