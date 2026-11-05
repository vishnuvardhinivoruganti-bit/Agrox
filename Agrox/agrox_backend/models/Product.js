
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    farmerName: {
      type: String,
      default: "Demo Farmer",
    },
     farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);


