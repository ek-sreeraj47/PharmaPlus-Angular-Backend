require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const data = require('./products.seed');

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not set in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Optional: clear existing (careful in prod!)
    // await Product.deleteMany({});

    // Avoid duplicates if you re-run: upsert by numeric id or name
    const ops = data.map(p => ({
      updateOne: {
        filter: p.id ? { id: p.id } : { name: p.name },
        update: { $set: p },
        upsert: true
      }
    }));

    const res = await Product.bulkWrite(ops);
    console.log('✅ Seed complete:', {
      upserts: res.upsertedCount,
      modified: res.modifiedCount,
      matched: res.matchedCount
    });
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
