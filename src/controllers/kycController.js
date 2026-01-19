const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3 } = require("../config/s3bucket");
const kycRepo = require("../repository/kyc.repo");

const BUCKET = "realestate-kyc-documents";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const LIMIT = 2;

/* ===================== HELPERS ===================== */

const parsePage = (req) =>
  Math.max(parseInt(req.query.page, 10) || 1, 1);

/**
 * Normalize search input based on intent
 * - PAN  -> UPPERCASE (exact)
 * - Name -> lowercase (partial)
 */
const normalizeSearch = (value) => {
  const trimmed = value.replace(/\s+/g, "");

  // PAN format: ABCDE1234F
  if (/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Default → name search
  return trimmed.toLowerCase();
};

/* ===================== PRESIGN ===================== */

exports.generatePresignedUrls = async (req, res) => {
  try {
    const { aadhaarType, panType, voterType, otherType } = req.body;

    if (
      !ALLOWED_TYPES.includes(aadhaarType) ||
      !ALLOWED_TYPES.includes(panType)
    ) {
      return res.status(400).json({
        message: "Invalid Aadhaar or PAN file type",
      });
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
      normalized_pan,

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

    if (!normalized_pan) {
      return res.status(400).json({
        message: "normalized_pan is required",
      });
    }

    const isDuplicate = await kycRepo.checkDuplicateCustomer({ phone });
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists with the same phone number",
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
      normalized_pan,

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

/* ===================== LIST (NO SEARCH) ===================== */

exports.getAllKycCustomers = async (req, res) => {
  try {
    const page = parsePage(req);
    const { items, totalCount } =
      await kycRepo.getAllKycCustomers(page);

    res.json({
      success: true,
      page,
      limit: LIMIT,
      totalPages: Math.ceil(totalCount / LIMIT),
      customers: items,
    });
  } catch (err) {
    console.error("Fetch KYC Error:", err);
    res.status(500).json({ message: "Failed to fetch KYC customers" });
  }
};

exports.getApprovedKycCustomers = async (req, res) => {
  try {
    const page = parsePage(req);
    const { items, totalCount } =
      await kycRepo.getApprovedKycCustomers(page);

    res.json({
      success: true,
      page,
      limit: LIMIT,
      totalPages: Math.ceil(totalCount / LIMIT),
      customers: items,
    });
  } catch (err) {
    console.error("Fetch Approved Error:", err);
    res.status(500).json({ message: "Failed to fetch approved customers" });
  }
};

exports.getPendingKycCustomers = async (req, res) => {
  try {
    const page = parsePage(req);
    const { items, totalCount } =
      await kycRepo.getPendingKycCustomers(page);

    res.json({
      success: true,
      page,
      limit: LIMIT,
      totalPages: Math.ceil(totalCount / LIMIT),
      customers: items,
    });
  } catch (err) {
    console.error("Fetch Pending Error:", err);
    res.status(500).json({ message: "Failed to fetch pending customers" });
  }
};

/* ===================== SEARCH (TAB AWARE) ===================== */

exports.searchAllKycCustomers = async (req, res) => {
  try {
    const page = parsePage(req);
    const query = req.query.query;
    if (!query) return res.status(400).json({ message: "Query required" });

    const search = normalizeSearch(query);
    const { items, totalCount } =
      await kycRepo.searchAllKycCustomers(page, search);

    res.json({
      success: true,
      page,
      limit: LIMIT,
      totalPages: Math.ceil(totalCount / LIMIT),
      customers: items,
    });
  } catch (err) {
    console.error("Search All Error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};

exports.searchApprovedKycCustomers = async (req, res) => {
  try {
    const page = parsePage(req);
    const query = req.query.query;
    if (!query) return res.status(400).json({ message: "Query required" });

    const search = normalizeSearch(query);
    const { items, totalCount } =
      await kycRepo.searchApprovedKycCustomers(page, search);

    res.json({
      success: true,
      page,
      limit: LIMIT,
      totalPages: Math.ceil(totalCount / LIMIT),
      customers: items,
    });
  } catch (err) {
    console.error("Search Approved Error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};

exports.searchPendingKycCustomers = async (req, res) => {
  try {
    const page = parsePage(req);
    const query = req.query.query;
    if (!query) return res.status(400).json({ message: "Query required" });

    const search = normalizeSearch(query);
    const { items, totalCount } =
      await kycRepo.searchPendingKycCustomers(page, search);

    res.json({
      success: true,
      page,
      limit: LIMIT,
      totalPages: Math.ceil(totalCount / LIMIT),
      customers: items,
    });
  } catch (err) {
    console.error("Search Pending Error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};

/* ===================== APPROVE & DELETE ===================== */

exports.approveKyc = async (req, res) => {
  try {
    const { customerId } = req.params;
    const updated = await kycRepo.approveKycCustomer(customerId);

    res.json({
      success: true,
      message: "KYC approved successfully",
      customer: updated,
    });
  } catch (err) {
    console.error("Approve Error:", err);
    res.status(500).json({ message: "Failed to approve KYC" });
  }
};

exports.deleteKycCustomerController = async (req, res) => {
  try {
    const { customerId } = req.params;
    const deleted = await kycRepo.deleteKycCustomer(customerId);

    if (!deleted) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({
      success: true,
      message: "Customer deleted successfully",
      customer: deleted,
    });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Failed to delete customer" });
  }
};
