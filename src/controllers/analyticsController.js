const analyticsRepo = require("../repository/analytics.repo");

/* ============================================================= */
/* ===================== CUSTOMER ANALYTICS ==================== */
/* ============================================================= */

/**
 * Get customer analytics
 * - total customers
 * - approved customers
 * - pending customers
 */
exports.getCustomerAnalytics = async (req, res) => {
  try {
    const [
      totalCustomers,
      approvedCustomers,
      pendingCustomers,
    ] = await Promise.all([
      analyticsRepo.countAllCustomers(),
      analyticsRepo.countApprovedCustomers(),
      analyticsRepo.countPendingCustomers(),
    ]);

    res.json({
      success: true,
      data: {
        totalCustomers,
        approvedCustomers,
        pendingCustomers,
      },
    });
  } catch (err) {
    console.error("Analytics Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics data",
    });
  }
};

/* ============================================================= */
/* ===================== SALES ANALYTICS ======================= */
/* ============================================================= */

/**
 * Get overall sales analytics summary
 */
exports.getSalesAnalytics = async (req, res) => {
  try {
    const data = await analyticsRepo.getSalesSummary();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Sales Analytics Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales analytics",
    });
  }
};

/* ============================================================= */
/* ============== PROJECT LIST FOR DROPDOWN ==================== */
/* ============================================================= */

/**
 * Get all project names (for analytics dropdown)
 */
exports.getAnalyticsProjectList = async (req, res) => {
  try {
    const projects = await analyticsRepo.getProjectList();

    res.json({
      success: true,
      projects,
    });
  } catch (err) {
    console.error("Project List Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project list",
    });
  }
};

/* ============================================================= */
/* ============ PROJECT-WISE FLAT STATUS SUMMARY =============== */
/* ============================================================= */

/**
 * Get flat summary for a specific project
 */
exports.getProjectSalesSummary = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
      });
    }

    const data = await analyticsRepo.getProjectFlatSummary(projectId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Project Sales Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project sales analytics",
    });
  }
};
