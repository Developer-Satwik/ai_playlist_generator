import React from 'react';
import '../styles/NavBar.css';

const NavBar = ({ isSidebarOpen, setIsSidebarOpen, onNewChat }) => {
  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleKeyDown = (e) => {
    // Handle Cmd+N (Mac) for new chat
    if ((e.metaKey) && e.key === 'n') {
      e.preventDefault();
      handleNewChat();
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <button 
        className={`floating-toggle ${isSidebarOpen ? 'hidden' : ''}`}
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <i className="fas fa-chevron-right"></i>
      </button>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1>
            <span>Learning Assistant</span>
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="toggle-sidebar"
            aria-label="Close sidebar"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <i className="fas fa-plus"></i>
            <span>New Chat</span>
            <kbd>⌘ N</kbd>
          </button>

          <div className="nav-links">
            <a href="#" className="active">
              <i className="fas fa-message"></i>
              <span>Chat</span>
            </a>
            <a href="#">
              <i className="fas fa-graduation-cap"></i>
              <span>Learning Paths</span>
            </a>
            <a href="#">
              <i className="fas fa-history"></i>
              <span>History</span>
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" />
            <div className="user-info">
              <span className="user-name">User</span>
              <span className="user-status">Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default NavBar;
