const express = require('express');
const { Types } = require('mongoose');
const router = express.Router();
const Product = require('../models/Product'); // ensure casing/filename matches

// Build absolute image URL if desired
const withBase = (path) => {
  if (!path) return path;
  const base = process.env.PUBLIC_BASE_URL || '';
  // if already absolute, leave it
  if (/^https?:\/\//i.test(path)) return path;
  return base ? `${base}${path}` : path;
};

// Normalize outgoing fields so frontend can rely on img/cat/desc
const normalize = (doc) => {
  // doc may be a Mongoose doc or plain object
  const p = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...p,
    img: withBase(p.img ?? p.image ?? null),
    cat: p.cat ?? p.category ?? null,
    desc: p.desc ?? p.description ?? null,
  };
};

// Coerce incoming body to your canonical field names
const coerceIn = (b = {}) => ({
  ...b,
  img: b.img ?? b.image,
  cat: b.cat ?? b.category,
  desc: b.desc ?? b.description,
});

// -------------------- LIST --------------------
// GET /api/products?featured=true&q=para&category=Vitamins&minPrice=10&maxPrice=500
//   &page=1&limit=12&sort=price|name|createdAt&order=asc|desc
router.get('/', async (req, res) => {
  try {
    const {
      featured,
      q,
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 50,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};
    if (typeof featured !== 'undefined') {
      query.featured = String(featured) === 'true';
    }
    if (category) {
      // match either cat or category stored in DB
      query.$or = [
        { cat: category },
        { category }
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (q) {
      const rx = new RegExp(String(q).trim(), 'i');
      query.$or = (query.$or || []).concat([
        { name: rx },
        { cat: rx },
        { category: rx },
        { desc: rx },
        { description: rx },
        { tag: rx },
      ]);
    }

    const sortMap = {
      price: 'price',
      name: 'name',
      createdAt: 'createdAt'
    };
    const sortField = sortMap[sort] || 'createdAt';
    const sortOrder = String(order).toLowerCase() === 'asc' ? 1 : -1;

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const lim = Math.max(1, Number(limit));

    const [items, total] = await Promise.all([
      Product.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(lim).lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      total,
      page: Number(page),
      limit: lim,
      items: items.map(normalize),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- GET ONE --------------------
// GET /api/products/:id (supports Mongo _id OR legacy numeric id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let doc = null;
    if (Types.ObjectId.isValid(id)) {
      doc = await Product.findById(id).lean();
    }
    if (!doc && !Number.isNaN(Number(id))) {
      doc = await Product.findOne({ id: Number(id) }).lean();
    }
    if (!doc) return res.status(404).json({ message: 'Not found' });

    res.json(normalize(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- CREATE --------------------
// POST /api/products
router.post('/', async (req, res) => {
  try {
    const body = coerceIn(req.body);
    const product = new Product(body);
    await product.save();
    res.status(201).json(normalize(product));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------- UPDATE (PATCH) --------------------
// PATCH /api/products/:id
router.patch('/:id', async (req, res) => {
  try {
    const body = coerceIn(req.body);
    const { id } = req.params;

    let updated = null;
    if (Types.ObjectId.isValid(id)) {
      updated = await Product.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).lean();
    }
    if (!updated && !Number.isNaN(Number(id))) {
      updated = await Product.findOneAndUpdate({ id: Number(id) }, { $set: body }, { new: true, runValidators: true }).lean();
    }
    if (!updated) return res.status(404).json({ message: 'Not found' });

    res.json(normalize(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------- DELETE (optional) --------------------
// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let deleted = null;
    if (Types.ObjectId.isValid(id)) {
      deleted = await Product.findByIdAndDelete(id).lean();
    }
    if (!deleted && !Number.isNaN(Number(id))) {
      deleted = await Product.findOneAndDelete({ id: Number(id) }).lean();
    }
    if (!deleted) return res.status(404).json({ message: 'Not found' });

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
