// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- Config ---
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Comma-separated list of allowed origins (can set in Render env):
// e.g. ALLOWED_ORIGINS=https://pharma-plus-angular-dhuj.vercel.app,http://localhost:4200
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// --- App ---
const app = express();
app.set('trust proxy', true); // good for Render/Cloud providers
app.use(express.json());

// CORS (allow localhost, specific domains, and *.vercel.app previews)
app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true); // server-to-server / SSR
            try {
                const url = new URL(origin);

                // Always allow *.vercel.app (all preview + prod deployments)
                if (url.hostname.endsWith('.vercel.app')) {
                    return cb(null, true);
                }

                // Explicit allow-list (from env or hardcoded)
                if (ALLOWED_ORIGINS.includes(origin)) {
                    return cb(null, true);
                }

                return cb(new Error(`Not allowed by CORS: ${origin}`));
            } catch (err) {
                return cb(new Error('Invalid Origin'), false);
            }
        },
        credentials: true,
        optionsSuccessStatus: 200,
    })
);

// --- Routes ---
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        uptime: process.uptime(),
        mongo: mongoose.connection.readyState, // 1 = connected
    });
});

// Auth routes
const authRoutes = require('./routes/auth.route');
app.use('/api/auth', authRoutes);

// Product routes
const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

// Root test route
app.get('/', (req, res) => {
    res.send('Backend is running ✅');
});

// 404 handler (for unmatched API routes)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    return next();
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('🚨 Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// --- DB + Start ---
async function start() {
    try {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is not set');
        }

        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        const server = app.listen(PORT, () =>
            console.log(`🚀 Server running on port ${PORT}`)
        );

        // Graceful shutdown
        const shutdown = (signal) => () => {
            console.log(`\n${signal} received. Closing server...`);
            server.close(async () => {
                await mongoose.connection.close();
                console.log('🛑 Server closed. MongoDB disconnected.');
                process.exit(0);
            });
        };
        process.on('SIGINT', shutdown('SIGINT'));
        process.on('SIGTERM', shutdown('SIGTERM'));
    } catch (err) {
        console.error('❌ Startup error:', err);
        process.exit(1);
    }
}

start();

module.exports = app; // optional (useful for tests)
