const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require("./routes/auth.route");
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});

// Product routes
const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

// Start server after DB connect
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('❌ DB connection error:', err));


