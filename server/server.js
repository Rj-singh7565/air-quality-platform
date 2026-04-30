const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/aqi', require('./routes/aqi'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Air Quality Platform API is running',
        database: 'MongoDB Atlas',
        timestamp: new Date().toISOString()
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

const PORT = process.env.PORT || 5000;

// Initialize database (async with MongoDB) and start server
const initDb = require('./config/initDb');

const startServer = async () => {
    try {
        await connectDB();
        await initDb();

        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api`);
            console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
            console.log(`💾 Database: MongoDB Atlas\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
