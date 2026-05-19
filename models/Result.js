const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  sno: {
    type: Number,
    required: true,
    min: 1
  },
  game: {
    type: String,
    trim: true,
    default: 'MAHADEV LOTTERY'
  },
  time: {
    type: String,
    required: true,
    trim: true
  },
  oldResult: {
    type: String,
    trim: true,
    default: '---'
  },
  newResult: {
    type: String,
    trim: true,
    default: 'wait..'
  },
  date: {
    type: String,
    trim: true,
    default: () => new Date().toISOString().split('T')[0]
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

ResultSchema.pre('save', function () {
  this.updatedAt = new Date();
});

ResultSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() });
});

module.exports = mongoose.model('Result', ResultSchema);