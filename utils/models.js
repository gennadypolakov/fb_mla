const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountSchema = new Schema({
  profileId: {
    type: String,
    required: true
  },
  profileName: {
    type: String
  },
  fbAccount: {
    login: {
      type: String,
      default: ''
    },
    password: {
      type: String,
      default: ''
    },
    days: {
      type: Number,
      default: 0
    },
    once_a_day: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: 0
    },
    interval: {
      type: Number,
      default: 0
    }
  },
  proxy: {
    type: String,
    default: ''
  },
  banned: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('accounts', accountSchema);
