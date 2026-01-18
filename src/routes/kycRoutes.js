const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  saveKyc,
  generatePresignedUrls,

  // LISTING
  getAllKycCustomers,
  getApprovedKycCustomers,
  getPendingKycCustomers,

  // SEARCH (TAB-WISE)
  searchAllKycCustomers,
  searchApprovedKycCustomers,
  searchPendingKycCustomers,

  // ACTIONS
  approveKyc,
  deleteKycCustomerController,
} = require("../controllers/kycController");

/* ================= LISTING ================= */

router.get("/", auth, getAllKycCustomers);
router.get("/approved", auth, getApprovedKycCustomers);
router.get("/pending", auth, getPendingKycCustomers);

/* ================= SEARCH ================= */
/**
 * Query param:
 * ?query=sayan&page=1
 */
router.get("/search/all", auth, searchAllKycCustomers);
router.get("/search/approved", auth, searchApprovedKycCustomers);
router.get("/search/pending", auth, searchPendingKycCustomers);

/* ================= ACTIONS ================= */

router.post("/kyc/presign", auth, generatePresignedUrls);
router.post("/kyc", auth, saveKyc);
router.put("/approve/:customerId", auth, approveKyc);
router.delete("/delete/:customerId", auth, deleteKycCustomerController);

module.exports = router;
