import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with error handling and configuration
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
} catch (error) {
  console.error('Error initializing Gemini API:', error);
}

// Safety configuration for the model
const safetySettings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
];

// Generation configuration for better outputs
const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// Helper function to extract and parse JSON from model response
const extractAndParseJSON = (text) => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('JSON parsing error:', error);
    throw new Error('Could not parse JSON from response');
  }
};

// Helper function to validate topic
const validateTopic = (topic) => {
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    throw new Error('Invalid topic provided');
  }
  return topic.trim();
};

export const generateSurveyQuestions = async (topic) => {
  try {
    if (!genAI) {
      throw new Error('Gemini API not initialized properly');
    }

    const validatedTopic = validateTopic(topic);
    console.log('Generating survey questions for topic:', validatedTopic);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      safetySettings,
      generationConfig,
    });
    
    const prompt = `As an expert learning consultant, create a comprehensive survey to understand a user's learning preferences, goals, and background for: "${validatedTopic}".

    The response must be a valid JSON object containing an array of questions that cover:
    1. Current knowledge level
    2. Learning style preferences
    3. Time commitment
    4. Specific areas of interest within the topic
    5. Learning goals and objectives
    6. Preferred content format
    7. Previous learning experiences
    
    Required JSON format:
    {
      "questions": [
        {
          "id": "string",
          "question": "string",
          "type": "multiple-choice" | "rating" | "text" | "checkbox",
          "options": ["array of options"] (for multiple-choice and checkbox),
          "min": number (for rating),
          "max": number (for rating),
          "required": boolean,
          "category": "knowledge" | "preferences" | "goals" | "background"
        }
      ],
      "metadata": {
        "topic": "string",
        "difficulty_levels": ["string"],
        "estimated_completion_time": "string"
      }
    }

    Create 8-10 relevant questions. Ensure questions are engaging, clear, and help create a personalized learning experience.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw API Response:', text);
    return extractAndParseJSON(text);
  } catch (error) {
    console.error('Error in generateSurveyQuestions:', error);
    throw error;
  }
};

export const analyzeSurveyResponses = async (topic, responses) => {
  try {
    if (!genAI) {
      throw new Error('Gemini API not initialized properly');
    }

    const validatedTopic = validateTopic(topic);
    console.log('Analyzing survey responses for topic:', validatedTopic);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      safetySettings,
      generationConfig,
    });
    
    const prompt = `As an expert learning consultant, analyze these learning preferences for "${validatedTopic}":
    ${JSON.stringify(responses, null, 2)}
    
    Generate detailed learning recommendations in this JSON format:
    {
      "learnerProfile": {
        "level": "beginner" | "intermediate" | "advanced",
        "learningStyle": "visual" | "auditory" | "reading/writing" | "kinesthetic",
        "timeCommitment": "string",
        "strengths": ["string"],
        "areasForImprovement": ["string"]
      },
      "contentPreferences": {
        "videoDuration": "short" | "medium" | "long",
        "contentTypes": ["video", "article", "interactive", "project"],
        "difficulty": "beginner" | "intermediate" | "advanced"
      },
      "searchKeywords": {
        "primary": ["string"],
        "secondary": ["string"],
        "advanced": ["string"]
      },
      "learningPath": {
        "estimatedDuration": "string",
        "stages": [
          {
            "name": "string",
            "description": "string",
            "objectives": ["string"],
            "keywords": ["string"],
            "recommendedResources": {
              "videoTopics": ["string"],
              "projectIdeas": ["string"],
              "practiceExercises": ["string"]
            }
          }
        ]
      },
      "additionalRecommendations": {
        "tools": ["string"],
        "communities": ["string"],
        "practiceResources": ["string"]
      }
    }
    
    Provide comprehensive recommendations that align with the user's goals and learning style.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Analysis Response:', text);
    return extractAndParseJSON(text);
  } catch (error) {
    console.error('Error analyzing survey responses:', error);
    throw error;
  }
};

export const generateLearningInsights = async (topic, learningHistory) => {
  try {
    if (!genAI) {
      throw new Error('Gemini API not initialized properly');
    }

    const validatedTopic = validateTopic(topic);
    console.log('Generating learning insights for topic:', validatedTopic);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      safetySettings,
      generationConfig,
    });
    
    const prompt = `As an expert learning consultant, analyze this learning history for "${validatedTopic}":
    ${JSON.stringify(learningHistory, null, 2)}
    
    Generate personalized insights and recommendations in this JSON format:
    {
      "progress": {
        "completedTopics": ["string"],
        "masteredConcepts": ["string"],
        "challengingAreas": ["string"],
        "timeSpent": "string",
        "learningPace": "string"
      },
      "insights": {
        "strengths": ["string"],
        "patterns": ["string"],
        "recommendations": ["string"]
      },
      "nextSteps": {
        "immediateActions": ["string"],
        "shortTermGoals": ["string"],
        "longTermGoals": ["string"]
      },
      "adaptiveSuggestions": {
        "contentAdjustments": ["string"],
        "paceAdjustments": ["string"],
        "focusAreas": ["string"]
      }
    }
    
    Provide actionable insights that help improve the learning experience.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Insights Response:', text);
    return extractAndParseJSON(text);
  } catch (error) {
    console.error('Error generating learning insights:', error);
    throw error;
  }
};

export const generateQuizQuestions = async (topic, learningStage) => {
  try {
    if (!genAI) {
      throw new Error('Gemini API not initialized properly');
    }

    const validatedTopic = validateTopic(topic);
    console.log('Generating quiz questions for topic:', validatedTopic);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      safetySettings,
      generationConfig,
    });
    
    const prompt = `As an expert educator, create engaging quiz questions for "${validatedTopic}" at the ${learningStage} level.
    
    Generate questions in this JSON format:
    {
      "quiz": {
        "topic": "string",
        "level": "string",
        "timeLimit": "string",
        "questions": [
          {
            "id": "string",
            "type": "multiple-choice" | "true-false" | "short-answer",
            "question": "string",
            "options": ["string"] (for multiple-choice),
            "correctAnswer": "string",
            "explanation": "string",
            "difficulty": "easy" | "medium" | "hard",
            "conceptTested": "string"
          }
        ]
      },
      "metadata": {
        "totalPoints": number,
        "passingScore": number,
        "recommendations": {
          "beforeQuiz": ["string"],
          "afterQuiz": ["string"]
        }
      }
    }
    
    Create 5-7 questions that test understanding and application of concepts.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Quiz Response:', text);
    return extractAndParseJSON(text);
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw error;
  }
};
