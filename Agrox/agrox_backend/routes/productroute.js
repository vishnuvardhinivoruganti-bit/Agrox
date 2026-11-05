
const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// GET /api/products/mine
// Fetch products belonging to the logged-in farmer
// ============================================
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can view their personal listings.",
      });
    }

    const products = await Product.find({
      farmerId: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Fetch farmer products error:", error);

    return res.status(500).json({
      message: "Unable to fetch your listings.",
    });
  }
});

// ============================================
// GET /api/products
// Fetch all products for the public marketplace
// ============================================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Fetch marketplace products error:", error);

    return res.status(500).json({
      message: "Unable to fetch products.",
    });
  }
});

// ============================================
// POST /api/products
// Add a new product (farmers only)
// ============================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Check user role
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only registered farmers can add products.",
      });
    }

    const {
      name,
      category,
      quantity,
      pricePerKg,
      location,
    } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      quantity === undefined ||
      quantity === "" ||
      pricePerKg === undefined ||
      pricePerKg === ""
    ) {
      return res.status(400).json({
        message:
          "Name, category, quantity and price are required.",
      });
    }

    // Convert and validate numeric fields
    const numericQuantity = Number(quantity);
    const numericPrice = Number(pricePerKg);

    if (
      !Number.isFinite(numericQuantity) ||
      numericQuantity <= 0 ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        message:
          "Quantity and price must be positive numbers.",
      });
    }

    // Validate location
    if (
      location !== undefined &&
      typeof location !== "string"
    ) {
      return res.status(400).json({
        message: "Location must be text.",
      });
    }

    // Find the logged-in farmer
    if (!mongoose.isValidObjectId(req.user.userId)) {
      return res.status(401).json({
        message: "Invalid farmer account. Please log in again.",
      });
    }

    const farmer = await User.findById(req.user.userId);

    if (!farmer || farmer.role !== "farmer") {
      return res.status(403).json({
        message: "A valid farmer account is required.",
      });
    }

    // Create and save the product
    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      quantity: numericQuantity,
      pricePerKg: numericPrice,
      location: location?.trim() || farmer.location || "",
      farmerName: farmer.name,
      farmerId: farmer._id,
    });

    return res.status(201).json({
      message: "Product added successfully!",
      product,
    });
  } catch (error) {
    console.error("Add product error:", error);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to add product.",
    });
  }
});

module.exports = router;

