const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const auth = require('../middleware/auth');
const User = require('../models/user');

// Create a new order
router.post('/', auth, async (req, res) => {
    try {
        const { items, total } = req.body;
        console.log('Creating order for user:', req.user._id);

        const order = new Order({
            user: req.user._id,
            items: items.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image
            })),
            total,
            status: 'pending'
        });

        const savedOrder = await order.save();
        console.log('Order saved:', savedOrder._id);

        // Update user's orders array
        await User.findByIdAndUpdate(req.user._id, {
            $push: { orders: savedOrder._id },
            $set: { cart: { items: {}, total: 0, count: 0 } }
        });

        const populatedOrder = await Order.findById(savedOrder._id)
            .populate('items.productId');

        res.status(201).json(populatedOrder);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
    try {
        console.log('Fetching orders for user:', req.user._id);

        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate('items.productId');

        console.log(`Found ${orders.length} orders`);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 