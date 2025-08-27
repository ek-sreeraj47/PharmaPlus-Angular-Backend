// backend/models/Product.js
const { Schema, model } = require('mongoose');

const productSchema = new Schema({
  // keep legacy numeric id if you want deterministic ids
  id: { type: Number, unique: true, sparse: true },

  name: { type: String, required: true, index: true },
  price: { type: Number, required: true },

  // image paths (support both keys)
  image: { type: String },
  img:   { type: String },         // <-- seed/UI often use this

  // categories (support both)
  category: { type: String },
  cat:      { type: String },

  // description (support both)
  description: { type: String },
  desc:        { type: String },

  // other optional fields you’ve used
  uses:     [{ type: String }],
  featured: { type: Boolean, default: false },
  tag:      { type: String },
  stock:    { type: Number }
}, { timestamps: true });

module.exports = model('Product', productSchema);
