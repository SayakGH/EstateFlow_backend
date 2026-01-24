const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  addPaymentController,
  getFlatPaymentHistoryController,
  getAllPayments,
  searchPaymentsController, // ✅ NEW IMPORT
} = require("../controllers/paymentsController");

// ================= PAYMENTS ROUTES =================

// ✅ Add payment to booked flat
router.post(
  "/flats/:projectId/:flatId/pay",
  auth,
  addPaymentController
);

// ✅ Get payment history for a specific flat
router.get(
  "/:projectId/:flatId/history",
  auth,
  getFlatPaymentHistoryController
);

// ✅ Get ALL payments with Pagination
router.get(
  "/all",
  auth,
  getAllPayments
);

// ✅ SEARCH payments (Paginated)
// Example: GET /payments/search?q=rahul&page=1
router.get(
  "/search",
  auth,
  searchPaymentsController
);

module.exports = router;
