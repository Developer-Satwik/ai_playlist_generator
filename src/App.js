import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import Chat from './components/Chat';
import NavBar from './components/NavBar';
import LearningPaths from './components/LearningPaths';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Profile from './components/Profile/Profile';
import ConversationHistory from './components/ConversationHistory';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import './styles/App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');

  const handleNewChat = () => {
    // Handle new chat functionality
  };

  return (
    <AuthProvider>
      <Router>
        <div className={`app ${currentTheme}`}>
          <NavBar 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            currentTheme={currentTheme}
            setCurrentTheme={setCurrentTheme}
            onNewChat={handleNewChat}
          />
          <div className={`main-content ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/learning-paths" 
                element={
                  <ProtectedRoute>
                    <LearningPaths />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/history" 
                element={
                  <ProtectedRoute>
                    <ConversationHistory />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
