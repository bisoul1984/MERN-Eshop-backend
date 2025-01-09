const express = require('express');
const router = express.Router();

router.get('/test-routes', (req, res) => {
    // Get all registered routes from the main app
    const routes = [];
    
    // Get the main Express app instance
    const app = req.app;
    
    // Loop through all registered routes
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            // Routes registered directly on the app
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            // Routes registered via router
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    routes.push({
                        path: handler.route.path,
                        methods: Object.keys(handler.route.methods),
                        baseUrl: middleware.regexp.toString()
                    });
                }
            });
        }
    });

    res.json({
        message: 'Routes test endpoint',
        routes: routes,
        productRoutes: true
    });
});

module.exports = router; 