const bookedFlatsRepo = require("../repository/bookings.repo");
const flatPaymentsRepo = require("../repository/payments.repo");
const projectRepo = require("../repository/project.repo");
const projectFlatsRepo = require("../repository/projectFlats.repo");

/* ================= ADD PAYMENT ================= */
exports.addPaymentController = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;
    const { amount, summary } = req.body;

    // 1) Get booked flat
    const booked = await bookedFlatsRepo.getBookedFlat(projectId, flatId);

    if (!booked) {
      return res.status(404).json({
        success: false,
        message: "Flat is not booked",
      });
    }

    const flat = await projectFlatsRepo.getFlatById(projectId, flatId);

    // 2) Check payment limit
    const newPaid = booked.paid + amount;

    if (newPaid > booked.totalPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment exceeds total amount",
      });
    }

    // 3) Update paid amount
    await bookedFlatsRepo.incrementPaidAmount(projectId, flatId, amount);

    // 4) Fetch project name
    const projectName = await projectRepo.getProjectNameById(projectId);

    // 5) Add payment record
    await flatPaymentsRepo.addPayment({
      projectId,
      projectName,
      flatId,
      customer: { id: booked.customer_id, name: booked.customer_name },
      amount,
      summary,
    });

    // 6) Mark flat sold if 50% paid
    if (newPaid >= booked.totalPayment * 0.5 && flat.status !== "sold") {
      await projectRepo.incrementProjectSoldCount(projectId);
      await projectFlatsRepo.updateFlatStatus(projectId, flatId, "sold");
    }

    return res.status(200).json({
      success: true,
      message: "Payment added",
      paid: newPaid,
    });
  } catch (err) {
    console.error("Add payment error:", err);

    return res.status(500).json({
      success: false,
      message: "Payment failed",
    });
  }
};

/* ================= GET PAYMENTS BY FLAT ================= */
exports.getFlatPaymentHistoryController = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;

    if (!projectId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "projectId and flatId are required",
      });
    }

    const payments = await flatPaymentsRepo.getPaymentsByFlat(
      projectId,
      flatId
    );

    return res.status(200).json({
      success: true,
      payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Get payment history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
};

/* ================= GET ALL PAYMENTS (PAGINATED) ================= */
exports.getAllPayments = async (req, res) => {
  try {
    // ✅ Read page from query (?page=1)
    let page = parseInt(req.query.page || "1", 10);

    // ✅ Prevent invalid page numbers
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    // ✅ Paginated repo call
    const result = await flatPaymentsRepo.getAllPayments(page);

    return res.status(200).json({
      success: true,

      payments: result.payments,

      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    });
  } catch (error) {
    console.error("Get all payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

/* ================= SEARCH PAYMENTS (PAGINATED) ================= */
/**
 * Search by:
 * - paymentId
 * - customer name
 * - projectName
 * - projectId
 * - flatId
 *
 * Example:
 * GET /payments/search?q=rahul&page=1
 */
exports.searchPaymentsController = async (req, res) => {
  try {
    const query = req.query.q;
    let page = parseInt(req.query.page || "1", 10);

    // ✅ Validate query
    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // ✅ Validate page
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    // ✅ Call repo search function
    const result = await flatPaymentsRepo.searchPayments(query, page);

    return res.status(200).json({
      success: true,

      payments: result.payments,

      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    });
  } catch (error) {
    console.error("Search payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search payments",
    });
  }
};
