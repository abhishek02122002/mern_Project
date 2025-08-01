const mongoose = require("mongoose");

const clickSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Links",
    required: true,
  },
  ip:String,
  city:String,
  country:String,
  region:String,
  lattitude:Number,
  longitutde:Number,
  ips:String,
  referrer:String,
  userAgent:String,
  deviceType:String,
  browser:String,
  clickedAt:{type:Date,default:Date.now()}
});

module.exports = mongoose.model('Clicks',clickSchema);
