import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/HomeScreen.css';

const HomeScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartLearning = () => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="home-screen">
      <div className="hero-section">
        <h1>Welcome to Learning Assistant</h1>
        <p>Your AI-powered companion for personalized learning journeys</p>

        <div className="cta-buttons">
          <button onClick={handleStartLearning} className="cta-button primary">
            Start Learning
            <i className="fas fa-arrow-right"></i>
          </button>
          <Link to={user ? "/learning-paths" : "/login"} className="cta-button secondary">
            Browse Paths
            <i className="fas fa-compass"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
