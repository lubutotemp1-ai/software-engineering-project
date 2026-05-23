require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [FRONTEND_URL, 'http://localhost:3000', 'https://health-made-easy.netlify.app', 'https://software-engineering-project-sand.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/health',       require('./routes/health'));
app.use('/api/education',    require('./routes/education'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/doctor',       require('./routes/doctor'));
app.use('/api/doctors',      require('./routes/doctors'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/diagnosis',    require('./routes/diagnosis'));
app.use('/api/schedules',    require('./routes/schedules'));

app.get('/', (req, res) => res.json({ message: '✅ Health Easy Portal API running', version: '3.0.0' }));
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Something went wrong.' }); });

app.listen(PORT, () => console.log(`🏥 Health Easy Portal Server on http://localhost:${PORT}`));
