const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// POST /api/education/ask
router.post('/ask', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a friendly health education assistant for a hospital portal.
Answer the following health question in simple, easy-to-understand language.
Keep the answer clear, accurate, and helpful. If it is a serious medical concern,
remind the user to consult a doctor.

Question: ${question}`,
    });

    res.json({ answer: response.text });

  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to get AI response.' });
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