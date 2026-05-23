require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');
const { ensureRuntimeSchema } = require('./db/ensureSchema');

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
  'https://software-engineering-project-epcl.onrender.com',
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
  if (/^https:\/\/(?:[a-z0-9-]+\.)?medi-point\.netlify\.app$/i.test(normalized)) return true;
  if (/^https:\/\/(?:[a-z0-9-]+\.)?netlify\.app$/i.test(normalized)) return true;
  if (/^https:\/\/(?:[a-z0-9-]+\.)?vercel\.app$/i.test(normalized)) return true;
  if (/^https:\/\/(?:[a-z0-9-]+\.)?onrender\.com$/i.test(normalized)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (process.env.NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

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

app.get('/', (req, res) => res.json({ message: '✅ Health Easy Portal API running', version: '3.0.1' }));
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Something went wrong.' });
});

async function startServer() {
  try {
    console.log('⏳ Initializing database...');
    await initDb();
    await ensureRuntimeSchema();
    console.log('✅ Database ready');
    app.listen(PORT, () => console.log(`🏥 Health Easy Portal Server on http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL in .env');
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set. AI features will not work.');
    }
    process.exit(1);
  }
}

startServer();
