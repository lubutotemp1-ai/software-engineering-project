require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const staticOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'https://health-made-easy.netlify.app',
  'https://software-engineering-project-sand.vercel.app',
  'https://medi-point.netlify.app',
  'https://www.medi-point.netlify.app',
];

const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [...new Set([...staticOrigins, ...extraOrigins])];

function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;
  // Netlify production + deploy previews
  if (/^https:\/\/([a-z0-9-]+--)?medi-point\.netlify\.app$/i.test(normalized)) return true;
  if (/^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/i.test(normalized)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn('CORS blocked origin:', origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const aiRouter = require('./routes/ai');
app.post('/api/ai/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  aiRouter.handleStripeWebhook(req, res);
});

app.use(express.json());

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/health',       require('./routes/health'));
app.use('/api/education',    require('./routes/education'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/doctor',       require('./routes/doctor'));
app.use('/api/doctors',      require('./routes/doctors'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/ai',           aiRouter);
app.use('/api/diagnosis',    require('./routes/diagnosis'));
app.use('/api/schedules',    require('./routes/schedules'));

app.get('/', (req, res) => res.json({ message: '✅ Health Easy Portal API running', version: '3.0.0' }));
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => console.log(`🏥 Health Easy Portal Server on http://localhost:${PORT}`));
