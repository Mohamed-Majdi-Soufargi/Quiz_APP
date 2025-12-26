// Replace with your actual key or use process.env.REACT_APP_GEMINI_KEY
const GEMINI_API_KEY = "AIzaSyCVKt7YRwMQdTspXYa-pGQHZobRkQ1HX3M"; 
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const fetchGemini = async (prompt) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Gemini API Request Failed");
  }

  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
};

export const generateQuizWithAI = async (params) => {
  const { topic, difficulty, numQuestions, gradeLevel } = params;
  try {
    const prompt = `Generate a ${difficulty} difficulty quiz for ${gradeLevel} students about "${topic}".
    Requirement: Generate exactly ${numQuestions} multiple-choice questions.
    Return JSON format:
    {
      "questions": [
        {
          "question": "string",
          "options": ["option0", "option1", "option2", "option3"],
          "correctAnswer": 0,
          "explanation": "string",
          "points": 10,
          "type": "multiple-choice"
        }
      ]
    }`;

    const result = await fetchGemini(prompt);
    return { success: true, questions: result.questions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const generateFromText = async (text, numQuestions = 5) => {
  try {
    const prompt = `Based on the following text, generate ${numQuestions} quiz questions:
    "${text}"
    Return JSON format:
    {
      "questions": [
        {
          "question": "string",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 1,
          "explanation": "string",
          "points": 15,
          "type": "multiple-choice"
        }
      ]
    }`;

    const result = await fetchGemini(prompt);
    return { success: true, questions: result.questions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};