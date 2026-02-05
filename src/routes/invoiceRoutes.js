const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  attachInvoiceToFlat,
  getFlatCustomerInvoiceDetails,
  swapLatestInvoice,
  deleteFlatInvoiceLink,
} = require("../controllers/invoiceController");
router.post("/attach-to-flat", attachInvoiceToFlat);
router.get(
  "/:projectId/:flatId/invoice-summary",
  getFlatCustomerInvoiceDetails,
);
router.patch("/flats/swap-latest-invoice", swapLatestInvoice);
router.patch("/reset", deleteFlatInvoiceLink);

module.exports = router;
