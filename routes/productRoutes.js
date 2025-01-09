const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const { getUpdatedUserData } = require('../utils/userUtils');

// Debug route - add this at the very top
router.get('/debug-routes', (req, res) => {
    const routes = router.stack
        .filter(r => r.route)
        .map(r => ({
            path: r.route.path,
            methods: Object.keys(r.route.methods),
            position: router.stack.indexOf(r)
        }));

    res.json({
        message: 'Product routes debug',
        routes,
        addToCartRoute: router.stack.find(r => 
            r.route && 
            r.route.path === '/add-to-cart' && 
            r.route.methods.post
        )
    });
});

// Add to cart route
router.post('/add-to-cart', async (req, res) => {
    const { userId, productId, price } = req.body;
    console.log('Add to cart request received:', { userId, productId, price });

    try {
        const user = await User.findById(userId);
        console.log('Found user:', user ? 'yes' : 'no', 'ID:', userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Find product
        const product = await Product.findById(productId);
        console.log('Found product:', product ? 'yes' : 'no', 'ID:', productId);
        if (!product) return res.status(404).json({ error: "Product not found" });

        // Initialize cart if needed
        if (!user.cart) {
            user.cart = { total: 0, count: 0, items: {} };
        }

        // Initialize items if needed
        if (!user.cart.items) {
            user.cart.items = {};
        }

        // Update cart items
        if (user.cart.items[productId]) {
            user.cart.items[productId].quantity += 1;
        } else {
            user.cart.items[productId] = {
                quantity: 1,
                product: {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    pictures: product.pictures
                }
            };
        }

        // Update cart totals
        const total = Object.values(user.cart.items).reduce((acc, item) => {
            return acc + (item.quantity * item.product.price);
        }, 0);

        user.cart.total = total;
        user.cart.count = Object.keys(user.cart.items).length;

        user.markModified('cart');
        await user.save();

        // Changed response format to match increase/decrease cart
        const response = {
            success: true,
            message: 'Cart updated',
            user: {
                _id: user._id,
                cart: user.cart
            }
        };

        console.log('\nSending response:', JSON.stringify(response, null, 2));
        return res.status(200).json(response);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message
        });
    }
});

// Add a test route to verify the router is working
router.get('/router-test', (req, res) => {
    res.json({
        message: 'Product router is working',
        routes: router.stack.map(r => ({
            path: r.route?.path,
            methods: r.route ? Object.keys(r.route.methods) : []
        }))
    });
});

// Test DB route
router.get('/test-db', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({
            count: products.length,
            products: products.map(p => ({
                id: p._id,
                name: p.name
            }))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get all products
router.get('/', async (req, res) => {
    try {
        const sort = req.query.sort || '-createdAt';
        const products = await Product.find().sort(sort);
        res.status(200).json(products);
    } catch (e) {
        res.status(400).send(e.message);
    }
});

// Add sample products route
router.post('/add-sample', async (req, res) => {
    try {
        const sampleProducts = [
            {
                name: "MacBook Pro",
                description: "Latest model with M1 chip",
                price: "1299",
                category: "laptops",
                pictures: [{
                    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
                    public_id: "macbook_pro"
                }]
            },
            {
                name: "iPhone 13",
                description: "Latest iPhone model",
                price: "999",
                category: "phones",
                pictures: [{
                    url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5",
                    public_id: "iphone_13"
                }]
            }
        ];

        await Product.insertMany(sampleProducts);
        res.json({ message: "Sample products added successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get products by category - MUST come before /:id route
router.get('/category/:category', async (req, res) => {
    const { category } = req.params;
    try {
        const products = await Product.find({ category });
        res.status(200).json(products);
    } catch (e) {
        res.status(400).send(e.message);
    }
});

// Create product
router.post('/', async (req, res) => {
    try {
        const { name, description, price, category, pictures } = req.body;
        const product = await Product.create({
            name, description, price, category, pictures
        });
        const products = await Product.find();
        res.status(201).json(products);
    } catch (e) {
        res.status(400).send(e.message);
    }
});

// Update product
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { name, description, price, category, pictures } = req.body;
        const product = await Product.findByIdAndUpdate(id, {
            name, description, price, category, pictures
        });
        const products = await Product.find();
        res.status(200).json(products);
    } catch (e) {
        res.status(400).send(e.message);
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Product.findByIdAndDelete(id);
        const products = await Product.find();
        res.status(200).json(products);
    } catch (e) {
        res.status(400).send(e.message);
    }
});

// Get single product - MUST come after /category route
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    console.log("Received request for product ID:", id);
    
    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid product ID format" });
    }

    try {
        const product = await Product.findById(id);
        console.log("Found product:", product);
        
        if (!product) {
            return res.status(404).json({ 
                message: "Product not found",
                requestedId: id
            });
        }

        // Find similar products excluding the current product
        const similar = await Product.find({ 
            category: product.category,
            _id: { $ne: id }
        }).limit(5);

        res.status(200).json({ product, similar });
    } catch (e) {
        console.error("Error in product route:", e);
        res.status(500).json({ 
            message: "Error retrieving product",
            error: e.message,
            requestedId: id
        });
    }
});

// Remove from cart
router.post('/remove-from-cart', async (req, res) => {
    const { userId, productId } = req.body;
    console.log('\n=== REMOVE FROM CART REQUEST ===');
    console.log('Request body:', req.body);

    if (!userId || !productId) {
        console.error('Missing required fields:', { userId, productId });
        return res.status(400).json({ 
            error: 'Bad Request',
            message: 'Missing userId or productId'
        });
    }

    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            console.error('User not found:', userId);
            return res.status(404).json({ 
                error: 'Not Found',
                message: 'User not found'
            });
        }

        console.log('Found user:', user._id);
        console.log('Current cart state:', JSON.stringify(user.cart, null, 2));

        // Initialize cart if needed
        if (!user.cart) {
            user.cart = { items: {}, total: 0, count: 0 };
        }

        // Check if product exists in cart
        if (!user.cart.items || !user.cart.items[productId]) {
            console.error('Product not found in cart:', productId);
            return res.status(404).json({ 
                error: 'Not Found',
                message: 'Product not found in cart'
            });
        }

        // Remove the product
        delete user.cart.items[productId];

        // Recalculate cart totals
        const cartItems = Object.values(user.cart.items || {});
        user.cart.count = cartItems.length;
        user.cart.total = cartItems.reduce((acc, item) => {
            return acc + (Number(item.quantity) * Number(item.product.price));
        }, 0);

        user.markModified('cart');
        await user.save();

        const response = {
            success: true,
            message: 'Product removed from cart',
            user: {
                _id: user._id,
                cart: user.cart
            }
        };

        console.log('Sending response:', JSON.stringify(response, null, 2));
        return res.status(200).json(response);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Server Error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Increase cart
router.post('/increase-cart', async (req, res) => {
    const { userId, productId, price } = req.body;
    console.log('Increase cart request received:', { userId, productId, price });

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Initialize cart if needed
        if (!user.cart) {
            user.cart = { total: 0, count: 0, items: {} };
        }

        // Initialize items if needed
        if (!user.cart.items) {
            user.cart.items = {};
        }

        // Get product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Update cart items
        if (user.cart.items[productId]) {
            user.cart.items[productId].quantity += 1;
        } else {
            user.cart.items[productId] = {
                quantity: 1,
                product: {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    pictures: product.pictures
                }
            };
        }

        // Update cart totals
        const cartItems = Object.values(user.cart.items);
        user.cart.count = cartItems.length;
        user.cart.total = cartItems.reduce((acc, item) => {
            return acc + (item.quantity * item.product.price);
        }, 0);

        user.markModified('cart');
        await user.save();

        const response = {
            success: true,
            message: 'Cart updated',
            user: {
                _id: user._id,
                cart: user.cart
            }
        };

        console.log('\nSending response:', JSON.stringify(response, null, 2));
        return res.status(200).json(response);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message
        });
    }
});

// Decrease cart
router.post('/decrease-cart', async (req, res) => {
    const { userId, productId, price } = req.body;
    console.log('\n=== DECREASE CART REQUEST ===');
    console.log('Request data:', { userId, productId, price });

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Initialize cart if needed
        if (!user.cart) {
            user.cart = { total: 0, count: 0, items: {} };
        }

        // Initialize items if needed
        if (!user.cart.items) {
            user.cart.items = {};
        }

        // Check if product exists in cart
        if (!user.cart.items[productId]) {
            return res.status(404).json({ error: "Product not found in cart" });
        }

        // Update cart items
        if (user.cart.items[productId].quantity > 1) {
            user.cart.items[productId].quantity -= 1;
        } else {
            delete user.cart.items[productId];
        }

        // Update cart totals
        const cartItems = Object.values(user.cart.items);
        user.cart.count = cartItems.length;
        user.cart.total = cartItems.reduce((acc, item) => {
            return acc + (item.quantity * item.product.price);
        }, 0);

        user.markModified('cart');
        await user.save();

        const response = {
            success: true,
            message: 'Cart updated',
            user: {
                _id: user._id,
                cart: user.cart
            }
        };

        console.log('\nSending response:', JSON.stringify(response, null, 2));
        return res.status(200).json(response);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message
        });
    }
});

module.exports = router; 