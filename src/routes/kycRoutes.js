const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  saveKyc,
  generatePresignedUrls,
  getAllKycCustomers,
  approveKyc,
  deleteKycCustomerController,
} = require("../controllers/kycController");

router.get("/", auth, getAllKycCustomers);
router.post("/kyc/presign", auth, generatePresignedUrls);
router.post("/kyc", auth, saveKyc);
router.put("/approve/:customerId", auth, approveKyc);
router.delete("/delete/:customerId", auth, deleteKycCustomerController);
module.exports = router;
