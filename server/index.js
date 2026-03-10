import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import './jobs/birthdayJob.js';

dotenv.config();
const app = express();

// ✅ CORS must be FIRST before anything else
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Handle preflight requests explicitly
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

app.get('/test', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Server is working!' });
});


app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch(err => console.error('❌ DB Error:', err));