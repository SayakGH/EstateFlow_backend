const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  getCustomerAnalytics,
} = require("../controllers/analyticsController");

/* ================= ANALYTICS COUNTS ================= */

/**
 * GET /api/v1/analytics/countCustomers
 *
 * Returns:
 * - totalCustomers
 * - approvedCustomers
 * - pendingCustomers
 */
router.get("/countCustomers", auth, getCustomerAnalytics);

module.exports = router;
