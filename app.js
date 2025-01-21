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
        'https://your-frontend-domain.vercel.app',
        'https://your-custom-domain.com'
    ],
    credentials: true
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

// Connect to MongoDB with more detailed error handling
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        console.log('MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')); // Hide credentials in log
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Handle 404 routes
app.use((req, res) => {
    console.log('404 for:', req.method, req.url);
    res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

module.exports = app; 