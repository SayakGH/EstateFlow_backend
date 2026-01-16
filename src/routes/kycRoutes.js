const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  saveKyc,
  generatePresignedUrls,
  getAllKycCustomers,
  approveKyc,
  deleteKycCustomerController,
  getApprovedKycCustomers, // newly added controller
  getPendingKycCustomers, // newly added controller
} = require("../controllers/kycController");

router.get("/", auth, getAllKycCustomers);
router.get("/approved", auth, getApprovedKycCustomers); // fetches only approved KYC customers
router.get("/pending", auth, getPendingKycCustomers); // fetches only pending KYC customers
router.post("/kyc/presign", auth, generatePresignedUrls);
router.post("/kyc", auth, saveKyc);
router.put("/approve/:customerId", auth, approveKyc);
router.delete("/delete/:customerId", auth, deleteKycCustomerController);
module.exports = router;
