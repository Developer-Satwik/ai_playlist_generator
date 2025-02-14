import React from 'react';
import '../styles/NavBar.css';

const NavBar = ({ isSidebarOpen, setIsSidebarOpen, currentTheme, setCurrentTheme, onNewChat }) => {
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
    <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h1>
          <span>Learning Assistant</span>
        </h1>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="toggle-sidebar"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <i className={`fas fa-chevron-${isSidebarOpen ? 'left' : 'right'}`}></i>
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
            <i className="fas fa-graduation-cap"></i>
            <span>Learning</span>
          </a>
          <a href="#">
            <i className="fas fa-history"></i>
            <span>History</span>
          </a>
          <a href="#">
            <i className="fas fa-bookmark"></i>
            <span>Saved</span>
          </a>
          <a href="#">
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </a>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="theme-toggle">
          <button 
            onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="theme-btn"
            aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <i className={`fas fa-${currentTheme === 'dark' ? 'sun' : 'moon'}`}></i>
            <span>Theme</span>
          </button>
        </div>
        
        <div className="user-profile">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" />
          <div className="user-info">
            <span className="user-name">User</span>
            <span className="user-status">Pro</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default NavBar;
