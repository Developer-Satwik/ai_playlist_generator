import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../firebase/services';
import '../styles/NavBar.css';

const NavBar = ({ isSidebarOpen, setIsSidebarOpen, onNewChat }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
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

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
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
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              <i className="fas fa-home"></i>
              <span>Home</span>
            </Link>
            <Link to="/chat" className={location.pathname === '/chat' ? 'active' : ''}>
              <i className="fas fa-message"></i>
              <span>Chat</span>
            </Link>
            <Link to="/learning-paths" className={location.pathname === '/learning-paths' ? 'active' : ''}>
              <i className="fas fa-graduation-cap"></i>
              <span>Learning Paths</span>
            </Link>
            <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>
              <i className="fas fa-history"></i>
              <span>History</span>
            </Link>
          </div>
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <div 
              className="user-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <img 
                src={user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
                alt="User Avatar" 
              />
              <div className="user-info">
                <span className="user-name">{user.displayName || 'User'}</span>
                <span className="user-status">Active</span>
              </div>
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <Link to="/profile" className="dropdown-item">
                    <i className="fas fa-user"></i>
                    Profile Settings
                  </Link>
                  <button onClick={handleLogout} className="dropdown-item">
                    <i className="fas fa-sign-out-alt"></i>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="auth-button">Login</Link>
              <Link to="/register" className="auth-button">Sign Up</Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default NavBar;
