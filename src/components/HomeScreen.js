import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomeScreen.css';

const HomeScreen = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/chat');
  };

  return (
    <div className="home-screen">
      <div className="hero-section">
        <h1 className="title">Enhanced Learning Assistant</h1>
        <p className="subtitle">Create personalized learning paths with AI</p>
        <button className="get-started-btn" onClick={handleGetStarted}>
          Get Started
        </button>
      </div>

      <div className="features-section">
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Personalized Learning</h3>
          <p>Get customized learning paths tailored to your goals and interests</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>AI-Powered</h3>
          <p>Leverage advanced AI to optimize your learning experience</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📚</div>
          <h3>Rich Resources</h3>
          <p>Access curated content from various trusted sources</p>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Share Your Goals</h3>
            <p>Tell us what you want to learn</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Get Your Path</h3>
            <p>Receive a personalized learning roadmap</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Start Learning</h3>
            <p>Follow your path and track progress</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
