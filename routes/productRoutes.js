const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Get all products
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/products - Fetching all products');
        const products = await Product.find();
        console.log(`Found ${products.length} products`);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        console.log(`GET /api/products/${req.params.id} - Fetching single product`);
        const product = await Product.findById(req.params.id);
        if (!product) {
            console.log(`Product not found with ID: ${req.params.id}`);
            return res.status(404).json({ message: "Product not found" });
        }
        
        console.log(`Found product: ${product.name}`);
        
        // Find similar products (same category)
        const similar = await Product.find({
            category: product.category,
            _id: { $ne: product._id }  // Exclude current product
        }).limit(3);
        
        console.log(`Found ${similar.length} similar products`);

        res.json({ 
            product,
            similar: similar || []  // Ensure we always return an array
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(400).json({ message: error.message });
    }
});

// Create product
router.post('/', async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update product
router.patch('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 