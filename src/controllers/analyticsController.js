const analyticsRepo = require("../repository/analytics.repo");

/* ===================== ANALYTICS ===================== */

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
