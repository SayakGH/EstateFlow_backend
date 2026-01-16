const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3 } = require("../config/s3bucket");
const kycRepo = require("../repository/kyc.repo");

const BUCKET = "realestate-kyc-documents";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

/* ===================== HELPERS ===================== */

/**
 * Parse pagination params from query
 * Defaults:
 * page = 1
 * limit = 10 (max 50)
 */
const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  return { page, limit };
};

/* ===================== PRESIGN ===================== */

exports.generatePresignedUrls = async (req, res) => {
  try {
    const { aadhaarType, panType, voterType, otherType } = req.body;

    if (
      !ALLOWED_TYPES.includes(aadhaarType) ||
      !ALLOWED_TYPES.includes(panType)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid Aadhaar or PAN file type" });
    }

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

      return getSignedUrl(s3, command, { expiresIn: 300 });
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

/* ===================== SAVE KYC ===================== */

exports.saveKyc = async (req, res) => {
  try {
    const {
      customerId,
      name,
      normalized_name,
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

    if (!name || !normalized_name || !phone) {
      return res.status(400).json({
        message: "Name, normalized_name and phone are required",
      });
    }

    if (!aadhaar || !pan || !aadhaarKey || !panKey) {
      return res.status(400).json({
        message: "Aadhaar and PAN are mandatory",
      });
    }

    const isDuplicate = await kycRepo.checkDuplicateCustomer({
      phone,
      normalized_name,
    });

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Customer already exists with the same phone number and name",
      });
    }

    await kycRepo.createKyc({
      customerId,
      name,
      normalized_name,
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

    res.json({
      success: true,
      message: "KYC submitted successfully",
    });
  } catch (err) {
    console.error("KYC Save Error:", err);
    res.status(500).json({ message: "Failed to save KYC data" });
  }
};

/* ===================== FETCH (PAGINATED) ===================== */

/**
 * Fetch ALL KYCs (paginated)
 */
exports.getAllKycCustomers = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req);
    const customers = await kycRepo.getAllKycCustomers(page, limit);

    res.json({
      success: true,
      page,
      limit,
      customers,
    });
  } catch (err) {
    console.error("Fetch KYC Error:", err);
    res.status(500).json({ message: "Failed to fetch KYC customers" });
  }
};

/**
 * Fetch APPROVED KYCs (paginated)
 */
exports.getApprovedKycCustomers = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req);
    const customers = await kycRepo.getApprovedKycCustomers(page, limit);

    res.json({
      success: true,
      page,
      limit,
      customers,
    });
  } catch (err) {
    console.error("Fetch Approved KYC Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved KYC customers",
    });
  }
};

/**
 * Fetch PENDING KYCs (paginated)
 */
exports.getPendingKycCustomers = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req);
    const customers = await kycRepo.getPendingKycCustomers(page, limit);

    res.json({
      success: true,
      page,
      limit,
      customers,
    });
  } catch (err) {
    console.error("Fetch Pending KYC Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending KYC customers",
    });
  }
};

/* ===================== APPROVE ===================== */

exports.approveKyc = async (req, res) => {
  try {
    const { customerId } = req.params;

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

/* ===================== DELETE ===================== */

exports.deleteKycCustomerController = async (req, res) => {
  try {
    const { customerId } = req.params;

    const deletedCustomer = await kycRepo.deleteKycCustomer(customerId);

    if (!deletedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      customer: deletedCustomer,
    });
  } catch (error) {
    console.error("Delete KYC error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
};
