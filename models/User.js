const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: {
        items: {
            type: Map,
            of: {
                quantity: Number,
                product: {
                    _id: String,
                    name: String,
                    price: Number,
                    image: String,
                    category: String
                }
            },
            default: new Map()
        },
        total: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Add password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

// Add token generation method
userSchema.methods.generateAuthToken = function() {
    const token = jwt.sign(
        { 
            _id: this._id,
            email: this.email,
            isAdmin: this.isAdmin 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    return token;
};

// Add to cart method
userSchema.methods.addToCart = async function(productId, product) {
    console.log('=== Adding to Cart ===');
    console.log('Current cart:', this.cart);
    console.log('Product to add:', { productId, product });

    // Initialize cart if it doesn't exist
    if (!this.cart) {
        console.log('Initializing new cart');
        this.cart = {
            items: new Map(),
            total: 0,
            count: 0
        };
    }

    // Add or update item in cart
    if (this.cart.items.has(productId)) {
        console.log('Updating existing item quantity');
        const item = this.cart.items.get(productId);
        item.quantity += 1;
    } else {
        console.log('Adding new item to cart');
        this.cart.items.set(productId, {
            quantity: 1,
            product: {
                _id: product._id,
                name: product.name,
                price: product.price,
                image: product.image,
                category: product.category
            }
        });
    }

    // Update cart totals
    this.cart.count = this.cart.items.size;
    this.cart.total = 0;
    this.cart.items.forEach((item) => {
        this.cart.total += item.quantity * item.product.price;
    });

    console.log('Updated cart:', this.cart);

    // Mark cart as modified
    this.markModified('cart');
    
    // Save and return the updated user
    const savedUser = await this.save();
    console.log('Saved user cart:', savedUser.cart);
    return savedUser;
};

// Add removeFromCart method
userSchema.methods.removeFromCart = async function(productId) {
    try {
        console.log('Removing product from cart:', productId);
        console.log('Current cart:', this.cart);

        // Initialize cart if needed
        if (!this.cart || !this.cart.items) {
            this.cart = {
                items: new Map(),
                total: 0,
                count: 0
            };
        }

        // Convert items to Map if it's an object
        if (!(this.cart.items instanceof Map)) {
            // If it's an object, convert it to Map
            const itemsObject = this.cart.items;
            this.cart.items = new Map();
            Object.keys(itemsObject).forEach(key => {
                this.cart.items.set(key, itemsObject[key]);
            });
        }

        // Check if item exists
        if (!this.cart.items.has(productId)) {
            throw new Error('Item not found in cart');
        }

        // Remove item
        this.cart.items.delete(productId);

        // Update totals
        let total = 0;
        let count = 0;
        this.cart.items.forEach((item) => {
            total += item.quantity * item.product.price;
            count += item.quantity;
        });

        this.cart.total = total;
        this.cart.count = count;

        // Mark as modified and save
        this.markModified('cart');
        await this.save();

        // Convert Map back to object for response
        const cartData = {
            items: Object.fromEntries(this.cart.items),
            total: this.cart.total,
            count: this.cart.count
        };

        console.log('Updated cart after removal:', cartData);
        return cartData;  // Return the object version, not this
    } catch (error) {
        console.error('Error in removeFromCart:', error);
        throw error;
    }
};

const User = mongoose.model('User', userSchema);
module.exports = User; 