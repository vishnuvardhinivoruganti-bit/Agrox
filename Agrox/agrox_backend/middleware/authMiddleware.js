const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Read the JWT token from the Authorization header.
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing.",
      });
    }

    // Verify the token using the secret configured by the backend.
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured in the backend .env file.");

      return res.status(500).json({
        message: "Authentication configuration error.",
      });
    }

    const decoded = jwt.verify(token, secret);

    // Support common user ID fields used in JWT payloads.
    const userId =
      decoded.userId ||
      decoded.id ||
      decoded._id;

    // Support common role fields used in JWT payloads.
    const role = String(
      decoded.role ||
      decoded.accountType ||
      decoded.user?.role ||
      ""
    ).trim().toLowerCase();

    if (!userId) {
      return res.status(401).json({
        message: "Invalid authentication token. Please log in again.",
      });
    }

    if (!role) {
      return res.status(403).json({
        message:
          "User role is missing from the authentication token. Please log in again.",
      });
    }

    // Provide a consistent structure for existing protected routes.
    req.user = {
      ...decoded,
      userId: String(userId),
      role,
    };

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Your session is invalid or expired. Please log in again.",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      message: "Authentication failed due to a server error.",
    });
  }
};

module.exports = authMiddleware;
