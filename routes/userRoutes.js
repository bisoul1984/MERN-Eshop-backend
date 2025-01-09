const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).send("User not found");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send("Invalid credentials");

        const token = jwt.sign(
            { 
                _id: user._id,
                email: user.email,
                isAdmin: user.isAdmin 
            }, 
            process.env.JWT_SECRET
        );

        res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                cart: user.cart,
            }
        });
    } catch (e) {
        res.status(400).send(e.message);
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

module.exports = router; 