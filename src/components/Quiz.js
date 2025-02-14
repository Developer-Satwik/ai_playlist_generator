import React, { useState, useEffect } from 'react';
import { generateQuizQuestions } from '../services/geminiService';
import '../styles/Quiz.css';

const Quiz = ({ topic, learningStage, onComplete }) => {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadQuiz();
  }, [topic, learningStage]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      const quizData = await generateQuizQuestions(topic, learningStage);
      setQuiz(quizData);
    } catch (err) {
      setError('Failed to load quiz questions. Please try again.');
      console.error('Quiz loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    
    let correctAnswers = 0;
    quiz.quiz.questions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    return Math.round((correctAnswers / quiz.quiz.questions.length) * 100);
  };

  const handleSubmit = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);
    if (onComplete) {
      onComplete({
        score: finalScore,
        answers,
        passingScore: quiz.metadata.passingScore,
        recommendations: quiz.metadata.recommendations
      });
    }
  };

  const renderQuestion = (question) => {
    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="quiz-options">
            {question.options.map((option, index) => (
              <label key={index} className="quiz-option">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'true-false':
        return (
          <div className="quiz-options">
            {['True', 'False'].map((option) => (
              <label key={option} className="quiz-option">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'short-answer':
        return (
          <div className="quiz-short-answer">
            <textarea
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              placeholder="Type your answer here..."
              rows={3}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="quiz-loading">Loading quiz questions...</div>;
  }

  if (error) {
    return (
      <div className="quiz-error">
        <p>{error}</p>
        <button onClick={loadQuiz} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  if (showResults) {
    return (
      <div className="quiz-results">
        <h2>Quiz Results</h2>
        <div className="score-display">
          <div className="score-circle">
            <span className="score-number">{score}%</span>
          </div>
          <p className="pass-fail">
            {score >= quiz.metadata.passingScore ? 'Passed! 🎉' : 'Keep practicing! 💪'}
          </p>
        </div>

        <div className="questions-review">
          {quiz.quiz.questions.map((question, index) => (
            <div key={index} className="question-review">
              <h3>Question {index + 1}</h3>
              <p>{question.question}</p>
              <p className="your-answer">
                Your answer: <span>{answers[question.id] || 'Not answered'}</span>
              </p>
              <p className="correct-answer">
                Correct answer: <span>{question.correctAnswer}</span>
              </p>
              <div className="explanation">
                <h4>Explanation:</h4>
                <p>{question.explanation}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="recommendations">
          <h3>Recommendations</h3>
          <div className="recommendation-section">
            <h4>Next Steps:</h4>
            <ul>
              {quiz.metadata.recommendations.afterQuiz.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>

        <button onClick={loadQuiz} className="retry-button">
          Take Another Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>{quiz.quiz.topic} Quiz</h2>
        <p className="quiz-info">
          Level: {quiz.quiz.level} | Time Limit: {quiz.quiz.timeLimit}
        </p>
      </div>

      <div className="quiz-progress">
        <div 
          className="progress-bar"
          style={{ width: `${((currentQuestion + 1) / quiz.quiz.questions.length) * 100}%` }}
        />
        <span className="progress-text">
          Question {currentQuestion + 1} of {quiz.quiz.questions.length}
        </span>
      </div>

      <div className="quiz-content">
        <div className="question-card">
          <h3 className="question-text">
            {quiz.quiz.questions[currentQuestion].question}
          </h3>
          {renderQuestion(quiz.quiz.questions[currentQuestion])}
        </div>

        <div className="quiz-navigation">
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              className="nav-button prev"
            >
              Previous
            </button>
          )}
          
          {currentQuestion < quiz.quiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              className="nav-button next"
              disabled={!answers[quiz.quiz.questions[currentQuestion].id]}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="nav-button submit"
              disabled={Object.keys(answers).length !== quiz.quiz.questions.length}
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz; 