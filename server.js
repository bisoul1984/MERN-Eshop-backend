const app = require('./app');
const port = process.env.PORT || 8081;

// For Vercel serverless deployment
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// Export the app for Vercel
module.exports = app;