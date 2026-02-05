const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  attachCancellationToFlat,
  getFlatCustomerCancellationDetails,
  swapLatestCancellation,
} = require("../controllers/cancellationController");
router.post("/attach-to-flat", attachCancellationToFlat);
router.get(
  "/:projectId/:flatId/cancellation-summary",
  getFlatCustomerCancellationDetails,
);
router.patch("/flats/swap-latest-cancellation", swapLatestCancellation);

module.exports = router;
