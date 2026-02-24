const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  getCustomerAnalytics,
  getSalesAnalytics,
  getAnalyticsProjectList,
  getProjectSalesSummary,
} = require("../controllers/analyticsController");

/* ============================================================= */
/* ================= CUSTOMER ANALYTICS ======================== */
/* ============================================================= */

/**
 * GET /api/v1/analytics/countCustomers
 */
router.get("/countCustomers", auth, getCustomerAnalytics);

/* ============================================================= */
/* ================= SALES SUMMARY ============================= */
/* ============================================================= */

/**
 * GET /api/v1/analytics/salesSummary
 */
router.get("/salesSummary", auth, getSalesAnalytics);

/* ============================================================= */
/* ================= PROJECT DROPDOWN LIST ===================== */
/* ============================================================= */

/**
 * GET /api/v1/analytics/projects
 * Returns: [{ id, name }]
 */
router.get("/projects", auth, getAnalyticsProjectList);

/* ============================================================= */
/* ================= PROJECT-WISE SALES ======================== */
/* ============================================================= */

/**
 * GET /api/v1/analytics/project/:projectId
 * Returns:
 * - totalApartments
 * - freeApartments
 * - bookedApartments
 * - soldApartments
 */
router.get("/project/:projectId", auth, getProjectSalesSummary);

module.exports = router;
