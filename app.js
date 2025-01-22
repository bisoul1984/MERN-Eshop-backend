// MongoDB connection with retry logic
const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            w: 'majority'
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        // In production, we might want to exit
        if (process.env.NODE_ENV === 'production') {
            console.error('Fatal error: Could not connect to MongoDB');
            process.exit(1);
        }
        // In development, retry
        setTimeout(connectDB, 5000);
    }
};

// Initialize MongoDB connection
connectDB().catch(console.error);
