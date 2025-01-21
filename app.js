const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://e-shop-frontend.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// MongoDB connection with retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            w: 'majority'
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Something went wrong!', 
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
    });
});

// Handle 404 routes
app.use((req, res) => {
    console.log('404 for:', req.method, req.url);
    res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectDB();
});

module.exports = app; 