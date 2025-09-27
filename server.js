const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/generation', express.static(path.join(__dirname, 'generation')));
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Whisper test page
app.get('/whisper-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'whisper-test.html'));
});

// 3-word subtitles test page
app.get('/test-3-word-subtitles', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test_3_word_subtitles.html'));
});

// Custom video creation page
app.get('/custom-video', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'custom_video.html'));
});

// Video history page
app.get('/video-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'video-history.html'));
});

// Audio history page
app.get('/audio-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'audio-history.html'));
});

// Image history page
app.get('/image-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'image-history.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Import API routes
const geminiRoutes = require('./routes/gemini-smart');
const mockGeminiRoutes = require('./routes/mock-gemini');
const flaxRoutes = require('./routes/flax');
const whisperRoutes = require('./routes/whisper');
const remotionRoutes = require('./routes/remotion');
const videoRoutes = require('./routes/video');
const kokoroRoutes = require('./routes/kokoro');
const videoHistoryRoutes = require('./routes/video-history');
const audioHistoryRoutes = require('./routes/audio-history');
const imageHistoryRoutes = require('./routes/image-history');

// Use real Gemini API for actual AI content generation
app.use('/api/gemini', geminiRoutes);
app.use('/api/flax', flaxRoutes);
app.use('/api/whisper', whisperRoutes);
app.use('/api/remotion', remotionRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/kokoro', kokoroRoutes);
app.use('/api/video-history', videoHistoryRoutes);
app.use('/api/audio-history', audioHistoryRoutes);
app.use('/api/image-history', imageHistoryRoutes);

// Pass io instance to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});