const mongoose = require('mongoose');
const Product = require('../models/product');
require('dotenv').config();

const products = [
    {
        name: 'iPhone 15 Pro',
        description: 'The latest iPhone featuring the A17 Pro chip, titanium design, and advanced camera system.',
        price: 999.99,
        category: 'Phones',
        image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=1200&hei=1200&fmt=jpeg&qlt=95&.v=1692845702708'
    },
    {
        name: 'MacBook Pro M2',
        description: 'Supercharged by M2 Pro or M2 Max, MacBook Pro takes its power and efficiency further than ever.',
        price: 1499.99,
        category: 'Laptops',
        image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202301?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1671304673229'
    },
    {
        name: 'iPad Pro M2',
        description: 'The ultimate iPad experience with the M2 chip, 12.9-inch Liquid Retina XDR display.',
        price: 799.99,
        category: 'Tablets',
        image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-pro-13-select-cell-spacegray-202210?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1664411207213'
    },
    {
        name: 'MacBook Air M2',
        description: 'Incredibly thin and light, yet delivers incredible performance with up to 18 hours of battery life.',
        price: 1199.99,
        category: 'Laptops',
        image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-midnight-select-20220606?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1653084303665'
    },
    {
        name: 'iPad Air',
        description: 'Powerful and colorful iPad Air with M1 chip, 10.9-inch Liquid Retina display.',
        price: 599.99,
        category: 'Tablets',
        image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-air-select-wifi-spacegray-202203?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1645066742664'
    }
];

async function seedProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing products
        await Product.deleteMany({});
        console.log('Cleared existing products');

        // Insert new products
        const result = await Product.insertMany(products);
        console.log(`Added ${result.length} products`);

        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding products:', error);
        process.exit(1);
    }
}

seedProducts(); 