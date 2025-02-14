import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import Chat from './components/Chat';
import NavBar from './components/NavBar';
import LearningPaths from './components/LearningPaths';
import './styles/App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');

  const handleNewChat = () => {
    // Handle new chat functionality
  };

  return (
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
            <Route path="/chat" element={<Chat />} />
            <Route path="/learning-paths" element={<LearningPaths />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
