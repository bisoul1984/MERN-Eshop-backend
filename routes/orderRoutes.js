const router = require('express').Router();
const Order = require('../models/Order');

router.get('/', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (e) {
        res.status(400).json(e.message);
    }
});

module.exports = router; 