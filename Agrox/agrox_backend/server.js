
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());
app.use("/api/products", require("./routes/productroute"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/orders", require("./routes/order"));

app.get("/", (req, res) => {
  res.json({
    message: "Agrox API is running",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected"
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");
    console.log("Database:", mongoose.connection.name);

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
      console.log(`Agrox API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
