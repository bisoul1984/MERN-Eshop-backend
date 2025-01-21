const app = require('./app');

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 8081;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// Add a health check route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

module.exports = app;