const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const jwt = require('jsonwebtoken');
const { getUpdatedUserData } = require('./utils/userUtils');

// Import routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const testRoutes = require('./routes/test-routes');

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

// Add JWT secret to environment variables
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'very-secret-key-shhhh';
}

// Middleware - order is important
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",  // Allow all origins for now
    credentials: true
}));

// Debug middleware - add this before routes
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', req.body);
    }
    if (req.headers) {
        console.log('Request headers:', req.headers);
    }
    next();
});

// Mount routes with explicit paths
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/test', testRoutes);

// Add route debugging
app.get('/api/debug-all-routes', (req, res) => {
    const debugRoutes = (stack, prefix = '') => 
        stack
            .filter(r => r.route || (r.name === 'router' && r.handle.stack))
            .map(r => {
                if (r.route) {
                    return {
                        path: prefix + r.route.path,
                        methods: Object.keys(r.route.methods)
                    };
                }
                if (r.name === 'router') {
                    const newPrefix = r.regexp.toString()
                        .replace('/^', '')
                        .replace('/(?=\\/|$)/i', '')
                        .replace(/\\/g, '');
                    return debugRoutes(r.handle.stack, newPrefix);
                }
            })
            .flat();

    res.json({
        routes: debugRoutes(app._router.stack),
        productRoutes: {
            registered: !!productRoutes,
            routes: productRoutes.stack
                .filter(r => r.route)
                .map(r => ({
                    path: r.route.path,
                    methods: Object.keys(r.route.methods)
                }))
        }
    });
});

// Add a route to verify product routes
app.get('/api/verify-routes', (req, res) => {
    const routes = app._router.stack
        .filter(r => r.route || (r.name === 'router' && r.handle.stack))
        .map(r => {
            if (r.route) {
                return {
                    path: r.route.path,
                    methods: Object.keys(r.route.methods)
                };
            }
            return {
                name: r.name,
                regexp: r.regexp.toString(),
                path: r.regexp.toString()
            };
        });
    
    res.json({
        routes,
        productRoutesRegistered: !!productRoutes,
        message: 'Route verification endpoint'
    });
});

// Error handling for 404 - keep this after routes
app.use((req, res, next) => {
    console.log('404 Not Found:', {
        method: req.method,
        url: req.originalUrl,
        body: req.body
    });
    res.status(404).json({ 
        error: `Cannot ${req.method} ${req.originalUrl}`,
        path: req.originalUrl,
        method: req.method
    });
});

// Error handling middleware - keep this last
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: err.message 
    });
});

const PORT = process.env.PORT || 8081;

// Add this function to initialize sample products
async function initializeSampleProducts() {
    try {
        // Check if products already exist
        const existingProducts = await Product.find({});
        if (existingProducts.length === 0) {
            const sampleProducts = [
                {
                    name: "MacBook Pro 2024",
                    description: "Latest model with M3 chip, featuring incredible performance and battery life",
                    price: "1499",
                    category: "laptops",
                    pictures: [{
                        url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
                        public_id: "macbook_pro"
                    }]
                },
                {
                    name: "iPhone 15 Pro",
                    description: "Latest iPhone with advanced camera system and A17 Pro chip",
                    price: "999",
                    category: "phones",
                    pictures: [{
                        url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5",
                        public_id: "iphone_15"
                    }]
                },
                {
                    name: "iPad Air",
                    description: "Powerful and portable tablet perfect for creativity and productivity",
                    price: "599",
                    category: "tablets",
                    pictures: [{
                        url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0",
                        public_id: "ipad_air"
                    }]
                }
            ];

            await Product.insertMany(sampleProducts);
            console.log("Sample products added successfully");
        }
    } catch (error) {
        console.error("Error initializing sample products:", error);
    }
}

// Add these socket event handlers after creating the io instance
io.on('connection', (socket) => {
    socket.on('new-user', (userId) => {
        console.log('New user connected:', userId);
        if (userId) {
            socket.userId = userId;
        }
    });

    socket.on('add-to-cart', async ({ userId, productId }) => {
        try {
            const user = await User.findById(userId);
            if (user) {
                const cartData = {
                    total: user.cart.total || 0,
                    count: user.cart.count || 0,
                    items: user.cart.items || {}
                };

                io.emit('cart-updated', {
                    success: true,
                    message: 'Cart updated',
                    user: {
                        _id: user._id,
                        cart: cartData
                    }
                });
            }
        } catch (e) {
            console.error("Socket error:", e);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Add error handling for socket connection
io.on('connect_error', (err) => {
    console.log('Socket connection error:', err);
});

// MongoDB connection and server start
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('Connected to MongoDB');
        initializeSampleProducts();
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Initialize cart for new users with consistent structure
app.post('/api/users/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.create({ 
            name, 
            email, 
            password,
            cart: { total: 0, count: 0 }
        });

        // Create token
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

        // Send user data with consistent structure
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            cart: user.cart,
            token,
            isAdmin: user.isAdmin
        });
    } catch (e) {
        if (e.code === 11000) return res.status(400).send('Email already exists');
        res.status(400).send(e.message);
    }
});

// Add this middleware to parse user token and attach user data
app.use(async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded._id).select('-password');
                req.user = user;
            }
        }
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        next();
    }
});

// Update login response to include full cart data
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Create token
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

        // Get updated user data with cart
        const updatedUser = await getUpdatedUserData(user._id);

        // Send user data with cart
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            cart: updatedUser.cart,
            token,
            isAdmin: updatedUser.isAdmin
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
});

// Add a route to get updated cart data
app.get('/api/users/cart', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const updatedUser = await getUpdatedUserData(req.user._id);
        res.json({ cart: updatedUser.cart });
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({ message: 'Error getting cart data', error: error.message });
    }
});

// Add a route to sync cart data
app.post('/api/users/sync-cart', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const updatedUser = await getUpdatedUserData(req.user._id);
        res.json({
            user: updatedUser,
            cart: updatedUser.cart
        });
    } catch (error) {
        console.error('Error syncing cart:', error);
        res.status(500).json({ message: 'Error syncing cart data', error: error.message });
    }
});

