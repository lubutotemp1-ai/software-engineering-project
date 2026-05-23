const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { consumeAiUse, getUsageStatus } = require('../utils/aiUsage');

function getModelText(response) {
  if (!response) return '';
  if (typeof response.response?.text === 'function') return response.response.text();
  if (typeof response.text === 'function') return response.text();
  if (typeof response.output_text === 'string') return response.output_text;
  if (typeof response?.output?.[0]?.content?.[0]?.text === 'string') return response.output[0].content[0].text;
  return '';
}

router.use(authMiddleware);

// POST /api/education/ask
router.post('/ask', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  try {
    if (req.user.role === 'patient') {
      const usage = await getUsageStatus(req.user.id);
      if (!usage.canUse) {
        return res.status(402).json({
          error: `Monthly AI limit reached (${usage.used}/${usage.limit}). Upgrade your plan for more uses.`,
          usage,
        });
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add it to the backend .env file.' });
    }

    console.log('Initializing GoogleGenAI...');
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('GoogleGenAI initialized successfully');

    console.log('Sending question to Gemini model...');
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `You are a friendly health education assistant for a hospital portal.
Answer the following health question in simple, easy-to-understand language.
Keep the answer clear, accurate, and helpful. If it is a serious medical concern,
remind the user to consult a doctor.

Question: ${question}`,
    });
    console.log('Received response from Gemini model');

    const answerText = getModelText(response);

    if (req.user.role === 'patient') {
      await consumeAiUse(req.user.id);
    }

    res.json({ answer: answerText });

  } catch (err) {
    console.error('Gemini education error:');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Full error object:', JSON.stringify(err, null, 2));
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
    const errMessage = err.response?.data?.error || err.message || 'Failed to get AI response.';
    if (errMessage.toLowerCase().includes('api key')) {
      return res.status(500).json({ error: 'Invalid GEMINI_API_KEY. Please check your backend .env file.' });
    }
    res.status(500).json({ error: errMessage });
  }
});

// GET /api/education/tips
router.get('/tips', (req, res) => {
  const tips = [
    { id: 1, category: 'Nutrition', tip: 'Drink at least 8 glasses of water daily to stay hydrated.', icon: '💧' },
    { id: 2, category: 'Exercise', tip: 'Walk for 30 minutes a day to improve cardiovascular health.', icon: '🚶' },
    { id: 3, category: 'Sleep', tip: 'Aim for 7-9 hours of sleep per night for optimal health.', icon: '😴' },
    { id: 4, category: 'Mental Health', tip: 'Practice deep breathing for 5 minutes to reduce stress.', icon: '🧘' },
    { id: 5, category: 'Nutrition', tip: 'Eat a variety of colorful vegetables and fruits every day.', icon: '🥦' },
    { id: 6, category: 'Prevention', tip: 'Wash your hands regularly to prevent the spread of germs.', icon: '🧼' },
    { id: 7, category: 'Exercise', tip: 'Stretching in the morning can boost your energy and flexibility.', icon: '🤸' },
    { id: 8, category: 'Mental Health', tip: 'Take regular breaks from screens to rest your eyes and mind.', icon: '👁️' },
  ];
  res.json(tips);
});

module.exports = router;