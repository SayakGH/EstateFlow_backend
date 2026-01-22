const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  addPaymentController,
  getFlatPaymentHistoryController,
} = require("../controllers/paymentsController");

// API 3 — Add payment to booked flat
router.post("/flats/:projectId/:flatId/pay", auth, addPaymentController);

router.get(
  "/:projectId/:flatId/history",
  auth,
  getFlatPaymentHistoryController,
);

module.exports = router;
