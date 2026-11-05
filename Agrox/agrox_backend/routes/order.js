
const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All order routes require a valid JWT.
router.use(authMiddleware);

// POST /api/orders
// A buyer places an order.
router.post("/", async (req, res) => {
  let reservedProductId = null;
  let reservedQuantity = 0;

  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({
        message: "Only buyers can place orders.",
      });
    }

    const { productId, quantity } = req.body;

    if (
      !mongoose.isValidObjectId(productId) ||
      quantity === undefined ||
      quantity === ""
    ) {
      return res.status(400).json({
        message: "A valid product ID and quantity are required.",
      });
    }

    const numericQuantity = Number(quantity);

    if (
      !Number.isFinite(numericQuantity) ||
      numericQuantity <= 0
    ) {
      return res.status(400).json({
        message: "Order quantity must be a positive number.",
      });
    }

    // Read the product to determine its farmer and current price.
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    if (!product.farmerId) {
      return res.status(400).json({
        message:
          "This older listing is not linked to a farmer account and cannot be ordered yet.",
      });
    }

    if (
      String(product.farmerId) === String(req.user.userId)
    ) {
      return res.status(400).json({
        message: "You cannot order your own product.",
      });
    }

    // Atomically reserve stock. MongoDB will only decrement the
    // quantity if enough stock remains at the moment of the update.
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        quantity: { $gte: numericQuantity },
      },
      {
        $inc: { quantity: -numericQuantity },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduct) {
      return res.status(409).json({
        message:
          "Not enough stock is available. Refresh the marketplace and try again.",
      });
    }

    reservedProductId = productId;
    reservedQuantity = numericQuantity;

    // Calculate the total using the database price, never a
    // price supplied by the browser.
    const pricePerKg = product.pricePerKg;
    const totalPrice = Number(
      (pricePerKg * numericQuantity).toFixed(2)
    );

    const order = await Order.create({
      buyerId: req.user.userId,
      farmerId: product.farmerId,
      productId: product._id,
      productName: product.name,
      quantity: numericQuantity,
      pricePerKg,
      totalPrice,
      status: "pending",
    });

    // Order saved: the stock reservation is complete.
    reservedProductId = null;
    reservedQuantity = 0;

    return res.status(201).json({
      message: "Order placed successfully!",
      order,
    });
  } catch (error) {
    console.error("Place order error:", error);

    // If saving the order failed after reserving stock, try to
    // restore the reserved quantity.
    if (reservedProductId && reservedQuantity > 0) {
      try {
        await Product.updateOne(
          { _id: reservedProductId },
          { $inc: { quantity: reservedQuantity } }
        );
      } catch (rollbackError) {
        console.error(
          "CRITICAL: Could not restore reserved stock:",
          rollbackError
        );
      }
    }

    return res.status(500).json({
      message: "Unable to place the order. Please try again.",
    });
  }
});

// GET /api/orders/mine
// Buyers see only their own order history.
router.get("/mine", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({
        message: "Only buyers can view buyer order history.",
      });
    }

    const orders = await Order.find({
      buyerId: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Buyer order history error:", error);

    return res.status(500).json({
      message: "Unable to load your orders.",
    });
  }
});

// GET /api/orders/farmer
// Farmers see orders associated with their account.
router.get("/farmer", async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can view incoming orders.",
      });
    }

    const orders = await Order.find({
      farmerId: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Farmer incoming orders error:", error);

    return res.status(500).json({
      message: "Unable to load incoming orders.",
    });
  }
});

// PATCH /api/orders/:id/status
// Only the farmer associated with an order can update it.
router.patch("/:id/status", async (req, res) => {
  let restoreProductId = null;
  let restoreQuantity = 0;

  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can update order status.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const { status } = req.body;

    if (!["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      farmerId: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found for your farmer account.",
      });
    }

    if (status === "rejected") {
      if (order.status !== "pending") {
        return res.status(400).json({
          message: "Only pending orders can be rejected.",
        });
      }

      // Restore stock only if the order is still pending.
      // The conditional update prevents two simultaneous status
      // requests from restoring the same stock twice.
      const rejectedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          farmerId: req.user.userId,
          status: "pending",
        },
        {
          $set: { status: "rejected" },
        },
        { new: true }
      );

      if (!rejectedOrder) {
        return res.status(409).json({
          message: "This order has already been updated.",
        });
      }

      restoreProductId = order.productId;
      restoreQuantity = order.quantity;

      try {
        await Product.updateOne(
          { _id: restoreProductId },
          { $inc: { quantity: restoreQuantity } }
        );

        restoreProductId = null;
        restoreQuantity = 0;
      } catch (restoreError) {
        // Keep this visible in the server log for manual recovery.
        console.error(
          "CRITICAL: Order rejected but stock restoration failed:",
          restoreError
        );

        return res.status(500).json({
          message:
            "Order was rejected, but stock could not be restored automatically. Please check the product stock in the database.",
          order: rejectedOrder,
        });
      }

      return res.status(200).json({
        message: "Order rejected and stock restored.",
        order: rejectedOrder,
      });
    }

    if (status === "accepted") {
      if (order.status !== "pending") {
        return res.status(400).json({
          message: "Only pending orders can be accepted.",
        });
      }
    }

    if (status === "completed") {
      if (order.status !== "accepted") {
        return res.status(400).json({
          message: "Only accepted orders can be completed.",
        });
      }
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        farmerId: req.user.userId,
        status: order.status,
      },
      {
        $set: { status },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        message: "This order has already been updated.",
      });
    }

    return res.status(200).json({
      message: `Order ${status} successfully.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      message: "Unable to update the order status.",
    });
  }
});

module.exports = router;
