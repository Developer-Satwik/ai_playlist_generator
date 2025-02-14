import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with error handling
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
} catch (error) {
  console.error('Error initializing Gemini API:', error);
}

export const generateSurveyQuestions = async (topic) => {
  try {
    if (!genAI) {
      throw new Error('Gemini API not initialized properly');
    }

    console.log('Using API Key:', process.env.REACT_APP_GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `You are a learning expert. Create a survey to understand a user's learning preferences for: "${topic}".
    
    The response must be a valid JSON object containing an array of questions.
    
    Required format:
    {
      "questions": [
        {
          "id": "q1",
          "question": "What is your current level of knowledge in ${topic}?",
          "type": "multiple-choice",
          "options": ["Beginner", "Intermediate", "Advanced"]
        },
        {
          "id": "q2",
          "question": "How much time can you dedicate to learning ${topic} per day?",
          "type": "multiple-choice",
          "options": ["30 minutes", "1 hour", "2+ hours"]
        }
      ]
    }
    
    Create 5 relevant questions for ${topic}. Make sure the response is a properly formatted JSON object that can be parsed.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw API Response:', text);
    
    // Try to extract JSON if it's wrapped in other text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log('Parsed JSON:', jsonData);
        return jsonData;
      } catch (parseError) {
        console.error('Error parsing matched JSON:', parseError);
        throw new Error('Could not parse JSON from response');
      }
    } else {
      console.error('No JSON object found in response');
      throw new Error('Invalid response format: No JSON object found');
    }
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

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Based on these learning preferences for "${topic}":
    ${JSON.stringify(responses, null, 2)}
    
    Generate learning recommendations in this JSON format:
    {
      "difficulty": "beginner" | "intermediate" | "advanced",
      "videoDuration": "short" | "medium" | "long",
      "searchKeywords": ["keyword1", "keyword2"],
      "learningPath": {
        "stages": [
          {
            "name": "string",
            "description": "string",
            "keywords": ["keyword1", "keyword2"]
          }
        ]
      }
    }
    
    Ensure the response is a valid JSON object.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Analysis Response:', text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log('Parsed Analysis JSON:', jsonData);
        return jsonData;
      } catch (parseError) {
        console.error('Error parsing analysis JSON:', parseError);
        throw new Error('Could not parse JSON from analysis response');
      }
    } else {
      console.error('No JSON object found in analysis response');
      throw new Error('Invalid response format: No JSON object found');
    }
  } catch (error) {
    console.error('Error analyzing survey responses:', error);
    throw error;
  }
};
