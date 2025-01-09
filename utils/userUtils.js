const User = require('../models/User');
const Product = require('../models/Product');

async function getUpdatedUserData(userId) {
    try {
        const user = await User.findById(userId)
            .select('-password')
            .lean();
        
        if (!user) {
            throw new Error('User not found');
        }

        // Ensure cart exists with proper structure
        if (!user.cart) {
            user.cart = { total: 0, count: 0, items: {} };
        }

        if (!user.cart.items) {
            user.cart.items = {};
        }

        // Update cart totals
        const cartItems = Object.values(user.cart.items);
        const total = cartItems.reduce((acc, item) => {
            return acc + (item.quantity * item.product.price);
        }, 0);

        user.cart.total = total;
        user.cart.count = cartItems.length;

        return {
            ...user,
            cart: {
                total: user.cart.total,
                count: user.cart.count,
                items: user.cart.items
            }
        };
    } catch (error) {
        console.error('Error getting updated user data:', error);
        throw error;
    }
}

module.exports = { getUpdatedUserData }; 