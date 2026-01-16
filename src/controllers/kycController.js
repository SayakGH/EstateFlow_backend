const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3 } = require("../config/s3bucket");
const kycRepo = require("../repository/kyc.repo");

const BUCKET = "realestate-kyc-documents";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

exports.generatePresignedUrls = async (req, res) => {
  try {
    const { aadhaarType, panType, voterType, otherType } = req.body;

    // Validate mandatory docs
    if (
      !ALLOWED_TYPES.includes(aadhaarType) ||
      !ALLOWED_TYPES.includes(panType)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid Aadhaar or PAN file type" });
    }

    // Validate optional docs
    if (voterType && !ALLOWED_TYPES.includes(voterType)) {
      return res.status(400).json({ message: "Invalid Voter ID file type" });
    }
    if (otherType && !ALLOWED_TYPES.includes(otherType)) {
      return res.status(400).json({ message: "Invalid Other ID file type" });
    }

    const customerId = crypto.randomUUID();
    const base = `kyc/${customerId}`;

    const createUrl = async (key, contentType) => {
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(s3, command, { expiresIn: 300 });
    };

    res.json({
      customerId,
      aadhaar: {
        key: `${base}/aadhaar`,
        url: await createUrl(`${base}/aadhaar`, aadhaarType),
      },
      pan: {
        key: `${base}/pan`,
        url: await createUrl(`${base}/pan`, panType),
      },
      voter: voterType
        ? {
            key: `${base}/voter`,
            url: await createUrl(`${base}/voter`, voterType),
          }
        : null,
      other: otherType
        ? {
            key: `${base}/other`,
            url: await createUrl(`${base}/other`, otherType),
          }
        : null,
    });
  } catch (err) {
    console.error("Presign Error:", err);
    res.status(500).json({ message: "Failed to generate upload URLs" });
  }
};

exports.saveKyc = async (req, res) => {
  try {
    const {
      customerId,
      name,
      phone,
      address,
      aadhaar,
      pan,
      voter,
      other,
      aadhaarKey,
      panKey,
      voterKey,
      otherKey,
    } = req.body;

    if (!aadhaar || !pan || !aadhaarKey || !panKey) {
      return res.status(400).json({ message: "Aadhaar and PAN are mandatory" });
    }

    await kycRepo.createKyc({
      customerId,
      name,
      phone,
      address,
      aadhaar,
      pan,
      voter,
      other,
      aadhaarKey,
      panKey,
      voterKey,
      otherKey,
    });

    res.json({ success: true, message: "KYC submitted successfully" });
  } catch (err) {
    console.error("KYC Save Error:", err);
    res.status(500).json({ message: "Failed to save KYC data" });
  }
};

exports.getAllKycCustomers = async (req, res) => {
  try {
    const customers = await kycRepo.getAllKycCustomers();

    res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (err) {
    console.error("Fetch KYC Error:", err);
    res.status(500).json({ message: "Failed to fetch KYC customers" });
  }
};

exports.approveKyc = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "customerId is required",
      });
    }

    const existing = await kycRepo.getKycById(customerId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const updated = await kycRepo.approveKycCustomer(customerId);

    res.json({
      success: true,
      message: "KYC approved successfully",
      customer: updated,
    });
  } catch (err) {
    console.error("Approve KYC Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to approve KYC",
    });
  }
};

exports.deleteKycCustomerController = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const deletedCustomer = await kycRepo.deleteKycCustomer(customerId);

    if (!deletedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      customer: deletedCustomer,
    });
  } catch (error) {
    console.error("Delete KYC error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
};
