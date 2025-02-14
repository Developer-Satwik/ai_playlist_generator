import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import '../styles/Survey.css';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

function Survey({ topic, conversationContext, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSurveyQuestions();
  }, [topic]);

  const generateSurveyQuestions = async () => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Generate a dynamic survey for learning "${topic}". 
      Return the response as a clean JSON array of question objects.
      Each question should have:
      - id: string
      - question: string
      - type: "select" | "range" | "text"
      - options: array of options (for select type)
      - min/max/step: numbers (for range type)
      - required: boolean
      - dependsOn: id of question it depends on (optional)
      
      Include questions about:
      1. Learning timeline (days/weeks)
      2. Prior experience with ${topic}
      3. Specific areas of interest within ${topic}
      4. Learning style preferences
      5. Available time per day (based on total timeline)
      6. Practical vs theoretical preference
      7. Project/goal-based questions specific to ${topic}
      
      Make questions and options specifically relevant to ${topic}.
      Consider typical learning paths and requirements for ${topic}.
      Format the JSON output without any formatting or indentation.
      Ensure the output is a single line of text that can be parsed as JSON.`;

      const result = await model.generateContent(prompt);
      const generatedQuestions = JSON.parse(result.response.text());
      setQuestions(generatedQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error generating survey:', error);
      setLoading(false);
    }
  };

  const calculateTimeFrames = (totalDays, hoursPerDay) => {
    const totalHours = totalDays * hoursPerDay;
    const averageVideoLength = 15; // minutes
    const totalVideos = Math.ceil((totalHours * 60) / averageVideoLength);
    
    return {
      videosPerDay: Math.ceil(totalVideos / totalDays),
      totalVideos,
      recommendedDuration: totalHours <= 10 ? 10 : totalHours <= 20 ? 20 : 30
    };
  };

  const handleAnswer = (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Find dependent questions and update their options
    const dependentQuestions = questions.filter(q => q.dependsOn === questionId);
    if (dependentQuestions.length > 0) {
      updateDependentQuestions(dependentQuestions, newAnswers);
    }

    // If this is a timeline-related answer, adjust time-per-day options
    const timelineQuestion = questions.find(q => q.id === 'timeline');
    const timePerDayQuestion = questions.find(q => q.id === 'timePerDay');
    if (questionId === 'timeline' && timePerDayQuestion) {
      updateTimeOptions(value, timePerDayQuestion);
    }
  };

  const updateTimeOptions = async (timeline, timeQuestion) => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Given that the user wants to learn ${topic} in ${timeline} days,
      suggest appropriate daily time commitment options.
      Consider:
      - Typical time needed to learn ${topic}
      - Complexity of the subject
      - User's timeline constraint
      Return as JSON array of options with value (minutes) and label.`;

    try {
      const result = await model.generateContent(prompt);
      const newOptions = JSON.parse(result.response.text());
      
      setQuestions(questions.map(q => 
        q.id === timeQuestion.id 
          ? { ...q, options: newOptions }
          : q
      ));
    } catch (error) {
      console.error('Error updating time options:', error);
    }
  };

  const updateDependentQuestions = async (dependentQuestions, currentAnswers) => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    for (const question of dependentQuestions) {
      const prompt = `Given these answers about learning ${topic}:
        ${JSON.stringify(currentAnswers)}
        
        Update the options for this question:
        ${question.question}
        
        Consider the user's previous answers and make options relevant to ${topic}.
        Return as JSON array of options.`;

      try {
        const result = await model.generateContent(prompt);
        const newOptions = JSON.parse(result.response.text());
        
        setQuestions(questions.map(q => 
          q.id === question.id 
            ? { ...q, options: newOptions }
            : q
        ));
      } catch (error) {
        console.error('Error updating dependent questions:', error);
        if (error.message.includes('429')) {
          alert('API quota exceeded. Please try again later.');
        } else {
          alert('An error occurred while updating questions. Please check your input.');
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: conversationContext,
      });

      // Calculate learning parameters
      const timeline = parseInt(answers.timeline);
      const timePerDay = parseInt(answers.timePerDay);
      const { totalVideos, videosPerDay, recommendedDuration } = calculateTimeFrames(timeline, timePerDay);

      // Generate learning profile
      const profilePrompt = `Based on these survey answers for learning ${topic}:
        ${JSON.stringify(answers)}
        
        Create a learning profile that includes:
        1. Recommended learning path
        2. Time distribution (${videosPerDay} videos per day)
        3. Focus areas based on user's interests
        4. Learning style adaptations
        5. Specific ${topic}-related recommendations
        
        Consider the user's timeline of ${timeline} days.`;

      const profileResult = await chat.sendMessage(profilePrompt);
      const learningProfile = profileResult.response.text();

      // Generate search queries based on profile
      const queries = generateSearchQueries(topic, answers, learningProfile);
      const searchResults = await Promise.all(
        queries.map(async query => {
          const videos = await searchYouTubeVideos(query);
          return videos.map(video => ({
            ...video,
            relevanceScore: analyzeVideoRelevance(video, topic, answers)
          }));
        })
      );

      // Sort and filter videos
      const allVideos = searchResults
        .flat()
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, totalVideos);

      // Generate roadmap
      const roadmapPrompt = `Create a ${timeline}-day learning roadmap for ${topic}.
        Include:
        - ${videosPerDay} videos per day
        - Daily learning objectives
        - Practice suggestions
        - Progress milestones
        
        Videos to incorporate: ${allVideos.map(v => v.title).join(', ')}
        User profile: ${learningProfile}`;

      const roadmapResult = await chat.sendMessage(roadmapPrompt);
      const roadmap = roadmapResult.response.text();

      onComplete(allVideos, roadmap);
    } catch (error) {
      console.error('Error generating playlist:', error);
    }
  };

  const generateSearchQueries = (topic, answers, learningProfile) => {
    const levelKeywords = {
      beginner: ['basics', 'introduction', 'fundamental', 'tutorial for beginners'],
      intermediate: ['intermediate', 'in-depth', 'detailed explanation'],
      advanced: ['advanced', 'expert', 'deep dive', 'complex']
    };

    const styleKeywords = {
      visual: ['visual explanation', 'animated', 'illustration'],
      theoretical: ['theoretical', 'concept explanation', 'lecture'],
      practical: ['hands-on', 'practical example', 'demonstration']
    };

    const focusKeywords = {
      comprehensive: ['comprehensive', 'complete guide', 'full course'],
      specific: ['specific topic', 'focused explanation'],
      practical: ['practical application', 'real-world example']
    };

    // Extract user preferences
    const level = answers.experienceLevel || 'beginner';
    const style = answers.learningStyle || 'visual';
    const focus = answers.learningFocus || 'comprehensive';

    // Build base queries
    const baseQueries = [
      `${topic} ${levelKeywords[level] ? levelKeywords[level][0] : 'tutorial'}`,
      `${topic} ${styleKeywords[style] ? styleKeywords[style][0] : 'visual explanation'} ${levelKeywords[level] ? levelKeywords[level][0] : 'tutorial'}`,
      `${level} ${topic} ${focusKeywords[focus] ? focusKeywords[focus][0] : 'overview'}`
    ];

    // Add interest-based queries
    const interests = answers.interests ? answers.interests.split(',').map(i => i.trim()) : [];
    const interestQueries = interests.map(interest =>
      `${topic} ${interest} ${levelKeywords[level] ? levelKeywords[level][0] : 'tutorial'}`
    );

    // Add goal-based queries
    const goals = answers.goals ? answers.goals.split(',').map(g => g.trim()) : [];
    const goalQueries = goals.map(goal =>
      `${topic} how to ${goal} ${levelKeywords[level] ? levelKeywords[level][0] : 'tutorial'}`
    );

    // Combine all queries
    return [...baseQueries, ...interestQueries, ...goalQueries];
  };

  const analyzeVideoRelevance = (video, topic, answers) => {
    const title = video.title.toLowerCase();
    const description = video.description.toLowerCase();
    const topicWords = topic.toLowerCase().split(' ');
    
    let score = 0;
    
    // Topic relevance (0-5 points)
    topicWords.forEach(word => {
      if (title.includes(word)) score += 3;
      if (description.includes(word)) score += 2;
    });

    // Level appropriateness (0-3 points)
    const levelTerms = {
      beginner: ['beginner', 'basic', 'introduction', 'start'],
      intermediate: ['intermediate', 'medium', 'moderate'],
      advanced: ['advanced', 'expert', 'complex', 'professional']
    };
    
    const userLevel = answers.experienceLevel || 'beginner';
    levelTerms[userLevel].forEach(term => {
      if (title.includes(term)) score += 2;
      if (description.includes(term)) score += 1;
    });

    // Learning style match (0-2 points)
    const styleTerms = {
      visual: ['visual', 'diagram', 'animation', 'illustration'],
      theoretical: ['theory', 'concept', 'lecture', 'explanation'],
      practical: ['practice', 'example', 'demo', 'hands-on']
    };

    const userStyle = answers.learningStyle || 'comprehensive';
    styleTerms[userStyle].forEach(term => {
      if (title.includes(term) || description.includes(term)) score += 1;
    });

    // Video quality indicators (0-3 points)
    if (video.viewCount > 10000) score += 1;
    if (video.likeCount > 1000) score += 1;

    // Duration preference (0-2 points)
    const duration = parseInt(video.duration);
    const preferredDuration = parseInt(answers.timePerDay) || 30;
    if (duration <= preferredDuration) score += 2;
    else if (duration <= preferredDuration * 1.5) score += 1;

    // Interest match (0-3 points)
    if (answers.interests) {
      const interests = answers.interests.toLowerCase().split(',');
      interests.forEach(interest => {
        if (title.includes(interest) || description.includes(interest)) score += 1;
      });
    }

    // Goal relevance (0-2 points)
    if (answers.goals) {
      const goals = answers.goals.toLowerCase().split(',');
      goals.forEach(goal => {
        if (title.includes(goal) || description.includes(goal)) score += 1;
      });
    }

    return score;
  };

  if (loading) {
    return <div className="survey-loading">Generating personalized questions...</div>;
  }

  const currentQuestion = questions[currentStep];
  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="survey">
      <div className="survey-progress">
        Question {currentStep + 1} of {questions.length}
      </div>
      
      <div className="question-container">
        <h3>{currentQuestion.question}</h3>
        
        {currentQuestion.type === 'select' && (
          <select
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            required={currentQuestion.required}
          >
            <option value="">Select an option</option>
            {currentQuestion.options.map((option, index) => (
              <option key={index} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        )}

        {currentQuestion.type === 'range' && (
          <div className="range-container">
            <input
              type="range"
              min={currentQuestion.min}
              max={currentQuestion.max}
              step={currentQuestion.step}
              value={answers[currentQuestion.id] || currentQuestion.min}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              required={currentQuestion.required}
            />
            <span className="range-value">
              {answers[currentQuestion.id] || currentQuestion.min}
            </span>
          </div>
        )}

        {currentQuestion.type === 'text' && (
          <input
            type="text"
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            required={currentQuestion.required}
          />
        )}
      </div>

      <div className="survey-navigation">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStep(current => current - 1)}
          >
            Previous
          </button>
        )}
        
        {currentStep < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(current => current + 1)}
            disabled={!answers[currentQuestion.id] && currentQuestion.required}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!Object.keys(answers).length === questions.length}
          >
            Generate Playlist
          </button>
        )}
      </div>
    </div>
  );
}

// Mock function - replace with actual YouTube API call
async function searchYouTubeVideos(query) {
  // Implement YouTube Data API v3 call here
  return [];
}

export default Survey;
