import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/LearningPaths.css';

const LearningPaths = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Paths' },
    { id: 'programming', name: 'Programming' },
    { id: 'design', name: 'Design' },
    { id: 'business', name: 'Business' },
    { id: 'science', name: 'Science' }
  ];

  const paths = [
    {
      id: 1,
      title: 'Web Development Fundamentals',
      description: 'Learn the basics of web development including HTML, CSS, and JavaScript.',
      category: 'programming',
      duration: '8 weeks',
      level: 'Beginner'
    },
    {
      id: 2,
      title: 'Data Science Essentials',
      description: 'Master the fundamentals of data science and machine learning.',
      category: 'science',
      duration: '12 weeks',
      level: 'Intermediate'
    },
    {
      id: 3,
      title: 'UI/UX Design Principles',
      description: 'Understand core principles of user interface and experience design.',
      category: 'design',
      duration: '6 weeks',
      level: 'Beginner'
    },
    {
      id: 4,
      title: 'Digital Marketing Strategy',
      description: 'Learn to create and execute effective digital marketing campaigns.',
      category: 'business',
      duration: '4 weeks',
      level: 'Beginner'
    }
  ];

  const filteredPaths = selectedCategory === 'all' 
    ? paths 
    : paths.filter(path => path.category === selectedCategory);

  return (
    <div className="learning-paths">
      <div className="paths-header">
        <h1>Learning Paths</h1>
        <p>Choose a learning path to start your journey</p>
      </div>

      <div className="category-filter">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="paths-grid">
        {filteredPaths.map(path => (
          <div key={path.id} className="path-card">
            <div className="path-content">
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              <div className="path-meta">
                <span className="duration">
                  <i className="fas fa-clock"></i>
                  {path.duration}
                </span>
                <span className="level">
                  <i className="fas fa-layer-group"></i>
                  {path.level}
                </span>
              </div>
            </div>
            <Link to={`/chat?path=${path.id}`} className="start-path-btn">
              Start Path
              <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningPaths; 