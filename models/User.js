const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const cartSchema = {
    total: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    items: {
        type: Map,
        of: {
            quantity: Number,
            product: {
                _id: mongoose.Schema.Types.ObjectId,
                name: String,
                price: Number,
                pictures: [{
                    url: String,
                    public_id: String
                }]
            }
        },
        default: {}
    }
};

const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'is required']
    },
    email: {
        type: String,
        required: [true, 'is required'],
        unique: true,
        index: true,
        validate: {
            validator: function(str) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(str);
            },
            message: props => `${props.value} is not a valid email`
        }
    },
    password: {
        type: String,
        required: [true, 'is required']
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: {
        type: Object,
        default: () => ({
            total: 0,
            count: 0,
            items: {}
        })
    },
    notifications: {
        type: Array,
        default: []
    }
}, {minimize: false});

UserSchema.pre('save', function(next) {
    const user = this;
    if(!user.isModified('password')) return next();

    bcrypt.genSalt(10, function(err, salt) {
        if(err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if(err) return next(err);

            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.updateCart = function(productId, price) {
    if (!this.cart) {
        this.cart = { total: 0, count: 0 };
    }

    if (this.cart[productId]) {
        this.cart[productId] += 1;
    } else {
        this.cart[productId] = 1;
    }

    const cartItems = Object.keys(this.cart).filter(key => 
        key !== 'total' && key !== 'count'
    );

    this.cart.count = cartItems.length;
    this.cart.total = cartItems.reduce((acc, key) => {
        return acc + (this.cart[key] * Number(price));
    }, 0);

    this.markModified('cart');
    return this;
};

const User = mongoose.model('User', UserSchema);
module.exports = User; 