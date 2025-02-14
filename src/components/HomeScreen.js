import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/HomeScreen.css';

const HomeScreen = () => {
  return (
    <div className="home-screen">
      <div className="hero-section">
        <h1>Welcome to Learning Assistant</h1>
        <p>Your AI-powered companion for personalized learning journeys</p>

        <div className="cta-buttons">
          <Link to="/chat" className="cta-button primary">
            Start Learning
            <i className="fas fa-arrow-right"></i>
          </Link>
          <Link to="/learning-paths" className="cta-button secondary">
            Browse Paths
            <i className="fas fa-compass"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
