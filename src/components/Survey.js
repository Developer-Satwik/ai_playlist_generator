import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchYouTubeVideos } from '../services/youtubeService';
import '../styles/Survey.css';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

function Survey({ topic, conversationContext, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

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
        Return a JSON array of option objects with 'value' and 'label' properties.
        Format: [{"value": "option1", "label": "Option 1"}, ...]
        Important: Return only the JSON array, no markdown formatting or backticks.`;

      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        
        // Clean up the response if it contains markdown or backticks
        const cleanJson = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const newOptions = JSON.parse(cleanJson);
        
        if (!Array.isArray(newOptions)) {
          throw new Error('Invalid options format: not an array');
        }

        // Validate option objects
        const validOptions = newOptions.every(opt => 
          typeof opt === 'object' && 
          opt !== null && 
          'value' in opt && 
          'label' in opt
        );

        if (!validOptions) {
          throw new Error('Invalid options format: missing required properties');
        }
        
        setQuestions(questions.map(q => 
          q.id === question.id 
            ? { ...q, options: newOptions }
            : q
        ));
      } catch (error) {
        console.error('Error updating dependent questions:', error);
        // Use default options if there's an error
        const defaultOptions = [
          { value: 'default1', label: 'Default Option 1' },
          { value: 'default2', label: 'Default Option 2' }
        ];
        setQuestions(questions.map(q => 
          q.id === question.id 
            ? { ...q, options: defaultOptions }
            : q
        ));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
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
      let queries = generateSearchQueries(topic, answers, learningProfile);
      
      // First attempt with specific queries
      let searchResults = await searchVideos(queries);
      
      // Sort and filter videos
      const allVideos = searchResults
        .flat()
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .filter((video, index, self) => 
          index === self.findIndex(v => v.id === video.id)
        )
        .slice(0, totalVideos);

      if (allVideos.length === 0) {
        throw new Error(`No relevant videos found for "${topic}". Please try:\n1. Using more general terms\n2. Checking the spelling\n3. Using a different but related topic`);
      }

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
      setIsCompleted(true);
    } catch (error) {
      console.error('Error generating playlist:', error);
      setError(error.message || 'An error occurred while generating the playlist. Please try again.');
      setLoading(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSearchQueries = (topic, answers, learningProfile) => {
    // Split topic into words and generate variations
    const topicWords = topic.toLowerCase().split(' ');
    const topicVariations = [
      topic,
      topicWords.join(' '),
      // Add common variations for technical topics
      `what are ${topic}`,
      `understanding ${topic}`,
      `learn about ${topic}`,
      topicWords.length > 1 ? topicWords.reverse().join(' ') : topic // Try reversed word order for multi-word topics
    ];

    const levelKeywords = {
      beginner: ['basics', 'introduction', 'fundamental', 'tutorial for beginners', 'getting started'],
      intermediate: ['intermediate', 'in-depth', 'detailed explanation', 'comprehensive guide'],
      advanced: ['advanced', 'expert', 'deep dive', 'complex', 'mastering']
    };

    const styleKeywords = {
      visual: ['visual explanation', 'animated', 'illustration', 'diagram explanation'],
      theoretical: ['theoretical', 'concept explanation', 'lecture', 'academic explanation'],
      practical: ['hands-on', 'practical example', 'demonstration', 'implementation']
    };

    const focusKeywords = {
      comprehensive: ['comprehensive', 'complete guide', 'full course', 'from scratch'],
      specific: ['specific topic', 'focused explanation', 'deep dive'],
      practical: ['practical application', 'real-world example', 'project based']
    };

    // Extract user preferences
    const level = answers.experienceLevel || 'beginner';
    const style = answers.learningStyle || 'visual';
    const focus = answers.learningFocus || 'comprehensive';

    // Build base queries with topic variations
    const baseQueries = topicVariations.flatMap(topicVar => [
      `${topicVar} ${levelKeywords[level] ? levelKeywords[level][0] : 'tutorial'}`,
      `${topicVar} ${styleKeywords[style] ? styleKeywords[style][0] : 'explanation'}`,
      `${level} ${topicVar} ${focusKeywords[focus] ? focusKeywords[focus][0] : 'guide'}`
    ]);

    // Add educational context queries
    const educationalQueries = [
      `${topic} course lecture`,
      `${topic} tutorial for ${level}`,
      `learn ${topic} ${level}`,
      `${topic} programming tutorial`,
      `${topic} coding guide`,
      `${topic} development course`
    ];

    // Add interest-based queries
    const interests = answers.interests ? answers.interests.split(',').map(i => i.trim()) : [];
    const interestQueries = interests.map(interest =>
      `${topic} ${interest} tutorial`
    );

    // Add goal-based queries
    const goals = answers.goals ? answers.goals.split(',').map(g => g.trim()) : [];
    const goalQueries = goals.map(goal =>
      `${topic} how to ${goal}`
    );

    // Combine all queries and remove duplicates
    const allQueries = [...new Set([
      ...baseQueries,
      ...educationalQueries,
      ...interestQueries,
      ...goalQueries
    ])];

    // Filter out empty queries and trim whitespace
    return allQueries
      .filter(query => query && query.trim())
      .map(query => query.trim());
  };

  const cleanAndParseJSON = (text) => {
    let cleanText = '';
    try {
      // First, try to find JSON content between backticks or code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```/s) ||
                       text.match(/`(\[.*?\]|\{.*?\})`/s);
      
      if (jsonMatch) {
        cleanText = jsonMatch[1];
      } else {
        // If no JSON in code blocks, clean the entire text
        cleanText = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/`/g, '')
          .trim();
      }

      // Remove any leading/trailing whitespace and newlines
      cleanText = cleanText.trim();

      // Handle cases where the AI might add explanatory text
      if (cleanText.includes('[') && cleanText.includes(']')) {
        cleanText = cleanText.substring(
          cleanText.indexOf('['),
          cleanText.lastIndexOf(']') + 1
        );
      } else if (cleanText.includes('{') && cleanText.includes('}')) {
        cleanText = cleanText.substring(
          cleanText.indexOf('{'),
          cleanText.lastIndexOf('}') + 1
        );
      }

      // Replace any special quotes with standard quotes
      cleanText = cleanText
        .replace(/[""]/g, '"')
        .replace(/[']/g, "'");

      // Handle potential line breaks and extra spaces in JSON
      cleanText = cleanText
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}');

      // Try parsing the cleaned text
      try {
        return JSON.parse(cleanText);
      } catch (parseError) {
        // If parsing fails, try to fix common JSON issues
        cleanText = cleanText
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2": ') // Fix unquoted property names
          .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes
          .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        
        return JSON.parse(cleanText);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.log('Original text:', text);
      console.log('Cleaned text:', cleanText);
      
      // If all else fails, try to extract an array or object from the text
      const fallbackMatch = text.match(/\[(.*)\]|\{(.*)\}/s);
      if (fallbackMatch) {
        try {
          const fallbackText = fallbackMatch[0];
          return JSON.parse(fallbackText);
        } catch (fallbackError) {
          console.error('Fallback parsing failed:', fallbackError);
        }
      }
      
      throw new Error('Failed to parse AI response as JSON. Response format was invalid.');
    }
  };

  const preprocessTopic = (topic) => {
    // Handle common abbreviations and technical terms
    const abbreviations = {
      'ai': 'artificial intelligence',
      'ml': 'machine learning',
      'nlp': 'natural language processing',
      'dl': 'deep learning'
    };

    // Split the topic into words
    let words = topic.toLowerCase().split(' ');
    
    // Replace abbreviations
    words = words.map(word => abbreviations[word] || word);
    
    // Create variations of the topic
    const variations = [
      words.join(' '), // Original with expanded abbreviations
      topic, // Original as-is
      words.includes('agents') ? words.join(' ').replace('agents', 'autonomous agents') : words.join(' '), // Expand 'agents' if present
    ];

    return variations;
  };

  const handleQuotaError = () => {
    setQuotaExceeded(false);
    setError(null);
    // Reset any other necessary state
    setIsGenerating(false);
  };

  const searchVideos = async (queries) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Preprocess the topic
      const topicVariations = preprocessTopic(topic);
      
      // Generate optimized search queries using AI with expanded topic variations
      const searchPrompt = `Generate exactly 8 YouTube search queries for finding educational videos about ${topicVariations.join(' or ')}.
      User needs:
      - Level: ${answers.experienceLevel || 'beginner'}
      - Style: ${answers.learningStyle || 'visual'}
      - Focus: ${answers.interests || 'general'}
      - Goals: ${answers.goals || 'understanding the basics'}

      Return ONLY a JSON array of strings in this exact format:
      ["query 1", "query 2", "query 3", "query 4", "query 5", "query 6", "query 7", "query 8"]

      Include these types of queries:
      1. University lectures
      2. Professional tutorials
      3. Comprehensive courses
      4. Beginner guides
      5. Technical implementations
      6. Industry examples
      7. Framework tutorials
      8. Platform-specific content

      NO explanation or additional text.`;

      const searchQueryResult = await model.generateContent(searchPrompt);
      const aiGeneratedQueries = cleanAndParseJSON(searchQueryResult.response.text());

      // Add platform-specific queries for technical topics
      const platformQueries = [
        'coursera',
        'udacity',
        'mit opencourseware',
        'stanford online',
        'google developers',
        'microsoft learn'
      ].map(platform => `${topicVariations[0]} ${platform} tutorial`);

      // Combine all queries
      const allQueries = [...new Set([
        ...aiGeneratedQueries,
        ...queries,
        ...platformQueries
      ])];

      // Generate video evaluation criteria using AI
      const evaluationPrompt = `Create evaluation criteria for "${topicVariations[0]}" videos.
      User needs:
      - Level: ${answers.experienceLevel || 'beginner'}
      - Style: ${answers.learningStyle || 'visual'}
      - Focus: ${answers.interests || 'general'}

      Return ONLY a JSON object in this exact format:
      {
        "required_terms": ["term1", "term2", "term3"],
        "bonus_terms": ["term1", "term2", "term3"],
        "red_flags": ["flag1", "flag2", "flag3"],
        "minimum_duration": 5,
        "maximum_duration": 45,
        "preferred_channels": ["type1", "type2", "type3"]
      }

      NO explanation or additional text.`;

      const evaluationResult = await model.generateContent(evaluationPrompt);
      const evaluationCriteria = cleanAndParseJSON(evaluationResult.response.text());

      // Search videos with improved queries
      const searchPromises = allQueries.map(async query => {
        try {
          const videos = await searchYouTubeVideos(query);
          return videos.map(video => ({
            ...video,
            relevanceScore: analyzeVideoWithAICriteria(video, evaluationCriteria, topic, answers)
          }));
        } catch (error) {
          console.error(`Error searching for query "${query}":`, error);
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      const validResults = results.filter(result => result.length > 0);
      
      if (validResults.length === 0) {
        // Generate alternative search suggestions with expanded context
        const fallbackPrompt = `As a technical education expert, the search for "${topicVariations[0]}" yielded no results.
        Suggest 10 alternative ways to find educational content about this topic.
        Consider:
        1. Related fundamental concepts
        2. Broader technical areas
        3. Specific applications or use cases
        4. Industry-standard tools or frameworks
        5. Prerequisites or foundational topics
        
        Return a JSON array of search queries that would yield educational content.
        Example: ["fundamental concept", "practical application", "tool tutorial"]`;

        const fallbackResult = await model.generateContent(fallbackPrompt);
        const alternativeQueries = cleanAndParseJSON(fallbackResult.response.text());
        
        const fallbackVideos = await Promise.all(
          alternativeQueries.map(query => searchYouTubeVideos(query))
        );
        
        const validFallbackVideos = fallbackVideos
          .flat()
          .filter(video => video !== null)
          .map(video => ({
            ...video,
            relevanceScore: analyzeVideoWithAICriteria(video, evaluationCriteria, topic, answers)
          }));
        
        if (validFallbackVideos.length === 0) {
          throw new Error(`Unable to find relevant videos for "${topic}". Try these related topics:\n${alternativeQueries.map(q => `- ${q}`).join('\n')}`);
        }
        
        return [validFallbackVideos];
      }
      
      return validResults;
    } catch (error) {
      console.error('Error in searchVideos:', error);
      if (error.message.includes('quota exceeded')) {
        setQuotaExceeded(true);
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const analyzeVideoWithAICriteria = (video, criteria, topic, answers) => {
    if (!video || !video.title || !video.description) {
      return 0;
    }

    const title = video.title.toLowerCase();
    const description = video.description.toLowerCase();
    let score = 0;

    // Check required terms (0-10 points)
    criteria.required_terms.forEach(term => {
      if (title.includes(term.toLowerCase())) score += 5;
      if (description.includes(term.toLowerCase())) score += 3;
    });

    // Check bonus terms (0-5 points)
    criteria.bonus_terms.forEach(term => {
      if (title.includes(term.toLowerCase())) score += 3;
      if (description.includes(term.toLowerCase())) score += 2;
    });

    // Check for red flags (-5 points each)
    criteria.red_flags.forEach(term => {
      if (title.includes(term.toLowerCase())) score -= 5;
      if (description.includes(term.toLowerCase())) score -= 3;
    });

    // Duration match (0-5 points)
    const duration = parseInt(video.duration) || 0;
    if (duration >= criteria.minimum_duration && duration <= criteria.maximum_duration) {
      score += 5;
    } else if (duration < criteria.minimum_duration) {
      score -= 3; // Too short
    } else if (duration > criteria.maximum_duration) {
      score -= 2; // Too long
    }

    // Channel type match (0-5 points)
    criteria.preferred_channels.forEach(channelType => {
      if (video.channelTitle.toLowerCase().includes(channelType.toLowerCase())) {
        score += 3;
      }
      if (description.toLowerCase().includes(channelType.toLowerCase())) {
        score += 2;
      }
    });

    // Video quality indicators (0-5 points)
    if (video.viewCount > 10000) score += 2;
    if (video.likeCount > 1000) score += 2;
    
    // Ensure score doesn't go below 0
    return Math.max(0, score);
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    // Clean up state
    setQuestions([]);
    setCurrentStep(0);
    setAnswers({});
    setIsGenerating(false);
    setError(null);
    setIsCompleted(false);
    setShowCancelConfirm(false);

    // Notify parent with null values to indicate cancellation
    onComplete(null, null);
  };

  const cancelConfirmation = () => {
    setShowCancelConfirm(false);
  };

  if (isCompleted) {
    return (
      <div className="survey-completed">
        <div className="completion-message">
          <h3>Survey Completed</h3>
          <p>Your personalized learning playlist has been generated!</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="survey-loading">
        Generating personalized questions...
        <button onClick={handleCancel} className="cancel-button">Cancel</button>
      </div>
    );
  }

  if (quotaExceeded) {
    return (
      <div className="survey-error-container">
        <h3>YouTube API Limit Reached</h3>
        <p>We've reached our daily limit for YouTube searches. Here are some alternative ways to continue learning:</p>
        <ul className="alternative-resources">
          <li>
            <strong>Educational Platforms:</strong>
            <ul>
              <li><a href="https://www.coursera.org/search" target="_blank" rel="noopener noreferrer">Coursera</a></li>
              <li><a href="https://www.edx.org/search" target="_blank" rel="noopener noreferrer">edX</a></li>
              <li><a href="https://ocw.mit.edu/search/" target="_blank" rel="noopener noreferrer">MIT OpenCourseWare</a></li>
            </ul>
          </li>
          <li>
            <strong>Documentation & Tutorials:</strong>
            <ul>
              <li><a href="https://www.w3schools.com/" target="_blank" rel="noopener noreferrer">W3Schools</a></li>
              <li><a href="https://www.freecodecamp.org/" target="_blank" rel="noopener noreferrer">freeCodeCamp</a></li>
              <li><a href="https://www.geeksforgeeks.org/" target="_blank" rel="noopener noreferrer">GeeksforGeeks</a></li>
            </ul>
          </li>
          <li>
            <strong>Community Resources:</strong>
            <ul>
              <li><a href="https://stackoverflow.com/" target="_blank" rel="noopener noreferrer">Stack Overflow</a></li>
              <li><a href="https://dev.to/" target="_blank" rel="noopener noreferrer">DEV Community</a></li>
              <li><a href="https://github.com/topics" target="_blank" rel="noopener noreferrer">GitHub Topics</a></li>
            </ul>
          </li>
        </ul>
        <div className="error-actions">
          <button onClick={handleQuotaError} className="try-again-button">
            Try Again
          </button>
          <button onClick={handleCancel} className="cancel-button">
            Cancel Survey
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="survey">
      {showCancelConfirm && (
        <div className="cancel-confirmation">
          <div className="cancel-confirmation-content">
            <h4>Cancel Survey?</h4>
            <p>Are you sure you want to cancel the survey? All progress will be lost.</p>
            <div className="cancel-confirmation-buttons">
              <button onClick={confirmCancel} className="confirm-cancel">Yes, Cancel</button>
              <button onClick={cancelConfirmation} className="keep-going">No, Continue</button>
            </div>
          </div>
        </div>
      )}
      
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
        <div className="nav-buttons">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(current => current - 1)}
              disabled={isGenerating}
            >
              Previous
            </button>
          )}
          
          {currentStep < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(current => current + 1)}
              disabled={(!answers[currentQuestion.id] && currentQuestion.required) || isGenerating}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!Object.keys(answers).length === questions.length || isGenerating}
              className={isGenerating ? 'loading' : ''}
            >
              {isGenerating ? 'Generating Playlist...' : 'Generate Playlist'}
            </button>
          )}
        </div>
        
        <button 
          type="button" 
          onClick={handleCancel}
          className="cancel-button"
          disabled={isGenerating}
        >
          Cancel Survey
        </button>
      </div>
      {error && <div className="survey-error">{error}</div>}
    </div>
  );
}

export default Survey;
