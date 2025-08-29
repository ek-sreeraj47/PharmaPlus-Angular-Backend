const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const sign = (u) => jwt.sign({ sub: u._id, email: u.email, username: u.username }, JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/signup and /api/auth/register (both work)
router.post(['/signup', '/register'], async (req, res) => {
    try {
        let { name, email, username, password } = req.body || {};
        if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password are required' });
        email = String(email).toLowerCase().trim();
        if (username) username = String(username).toLowerCase().trim();

        if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
        if (username && await User.findOne({ username })) return res.status(409).json({ error: 'Username already taken' });

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, username, password: hash });
        return res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, username: user.username }, token: sign(user) });
    } catch (err) {
        if (err?.code === 11000) {
            const field = Object.keys(err.keyPattern || { email: 1 })[0];
            return res.status(409).json({ error: `${field} already in use` });
        }
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/login (email OR username + password)
router.post('/login', async (req, res) => {
    try {
        let { email, username, password } = req.body || {};
        if (!password || (!email && !username)) return res.status(400).json({ error: 'Provide password and email or username' });
        if (email) email = String(email).toLowerCase().trim();
        if (username) username = String(username).toLowerCase().trim();

        const user = await User.findOne(email ? { email } : { username });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        return res.json({ user: { id: user._id, name: user.name, email: user.email, username: user.username }, token: sign(user) });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
