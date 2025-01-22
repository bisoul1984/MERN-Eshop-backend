const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Product = require('../models/product');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Signup route
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.create({ name, email, password });
        res.json(user);
    } catch (e) {
        if (e.code === 11000) return res.status(400).send('Email already exists');
        res.status(400).send(e.message);
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Initialize cart if it doesn't exist
        if (!user.cart) {
            user.cart = {
                items: new Map(),
                total: 0,
                count: 0
            };
            await user.save();
        }

        // Generate token
        const token = user.generateAuthToken();

        // Convert Map to Object for JSON response
        const userObject = user.toObject();
        if (userObject.cart && userObject.cart.items instanceof Map) {
            userObject.cart.items = Object.fromEntries(userObject.cart.items);
        }

        res.json({
            token,
            user: userObject
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false }).select('-password');
        res.json(users);
    } catch (e) {
        res.status(400).send(e.message);
    }
});

// Create admin
router.post('/create-admin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingAdmin = await User.findOne({ email, isAdmin: true });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        const admin = await User.create({
            name: "Admin User",
            email,
            password,
            isAdmin: true
        });

        res.json(admin);
    } catch (e) {
        res.status(400).json(e.message);
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password // Password will be hashed by the User model pre-save hook
        });

        // Create JWT token
        const token = jwt.sign(
            { 
                _id: user._id,
                email: user.email,
                isAdmin: user.isAdmin 
            }, 
            process.env.JWT_SECRET
        );

        // Send response
        res.status(201).json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: error.code === 11000 
                ? "Email already exists" 
                : "Registration failed. Please try again." 
        });
    }
});

// Add to cart
router.post('/add-to-cart', async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;
        console.log('Add to cart request:', { userId, productId, quantity });

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Add to cart
        await user.addToCart(productId, product);

        // Convert Map to Object for response
        const cartData = user.cart.toObject();
        if (cartData.items instanceof Map) {
            cartData.items = Object.fromEntries(cartData.items);
        }

        res.json(cartData);
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Remove from cart
router.delete('/remove-from-cart', async (req, res) => {
    try {
        const { userId, productId } = req.body;
        console.log('Remove from cart request:', { userId, productId });

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove from cart and get cart data
        const cartData = await user.removeFromCart(productId);

        res.json(cartData);
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get cart
router.get('/cart/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.json(user.cart);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'User routes are working' });
});

module.exports = router; 