const jwt = require("jsonwebtoken");
const userRepo = require("../repository/user.repo"); // Import your DynamoDB Repo
require("dotenv").config();

const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: Token missing" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Handle payload variations (id vs userId vs _id)
      const userId = decoded.id || decoded.userId || decoded._id;

      if (!userId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: Invalid token structure" });
      }

      // --- DYNAMODB CHANGE ---
      // Fetch fresh user data from DynamoDB
      const user = await userRepo.findUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check permission
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden: Access denied" });
      }

      // Remove password before attaching to request (Security)
      delete user.password;

      req.user = user;
      next();
    } catch (err) {
      console.error("Authorization Error:", err.message);
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }
  };
};

module.exports = authorizeRoles;
