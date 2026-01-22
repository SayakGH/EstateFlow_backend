const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  bookFlatController,
  getBookedFlatController,
} = require("../controllers/bookedController");

// API 1 — Book a flat (free → booked + first payment)
router.post("/flats/:projectId/:flatId/book", auth, bookFlatController);

// API 2 — Get booked flat details
router.get("/flats/:projectId/:flatId/booked", auth, getBookedFlatController);

module.exports = router;
