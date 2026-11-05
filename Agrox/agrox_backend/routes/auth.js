
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Generate a JWT compatible with the existing authMiddleware.js.
function generateToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      userId: String(user._id),
      role: String(user.role).trim().toLowerCase(),
    },
    secret,
    { expiresIn: "7d" }
  );
}

// Return public user details only. Never return the password hash.
function formatUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: String(user.role).trim().toLowerCase(),
    location: user.location || "",
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, location } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return res.status(400).json({
        message:
          "Name, email, and a password of at least 6 characters are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = String(role || "buyer")
      .trim()
      .toLowerCase();

    if (!["buyer", "farmer"].includes(normalizedRole)) {
      return res.status(400).json({
        message: "Role must be buyer or farmer.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    // Keep the same bcrypt password format used by the existing app.
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      location:
        typeof location === "string" ? location.trim() : "",
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Registration successful.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to register. Please try again.",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // IMPORTANT:
    // User.js defines password with select: false.
    // Explicitly select it so bcrypt can verify existing accounts.
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.password) {
      console.error(
        "Login failed: password hash is missing for user",
        String(user._id)
      );

      return res.status(500).json({
        message: "Unable to verify this account's password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const normalizedRole = String(user.role || "")
      .trim()
      .toLowerCase();

    if (!["buyer", "farmer"].includes(normalizedRole)) {
      return res.status(403).json({
        message: "This account has an invalid role.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to log in. Please try again.",
    });
  }
});

module.exports = router;
