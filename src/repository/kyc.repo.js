const {
  PutCommand,
  ScanCommand,
  UpdateCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");
const { s3 } = require("../config/s3bucket");
const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");

const TABLE_NAME = "kyc_customers";
const BUCKET_NAME = "realestate-kyc-documents";
const LIMIT = 10;

/* ================= DUPLICATE CHECK ================= */

exports.checkDuplicateCustomer = async ({ phone }) => {
  const result = await dynamoDB.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "phone = :phone",
      ExpressionAttributeValues: {
        ":phone": phone,
      },
    }),
  );

  return result.Items && result.Items.length > 0;
};

/* ================= CREATE ================= */

exports.createKyc = async (payload) => {
  const item = {
    _id: payload.customerId,
    name: payload.name,
    normalized_name: payload.normalized_name,

    // 🔹 PAN
    pan: payload.pan,
    normalized_pan: payload.normalized_pan, // ✅ stored normalized

    phone: payload.phone,
    address: payload.address,
    aadhaar: payload.aadhaar,

    voter_id: payload.voter || "",
    other_id: payload.other || "",

    aadhaar_key: payload.aadhaarKey,
    pan_key: payload.panKey,
    voter_key: payload.voterKey || "",
    other_key: payload.otherKey || "",

    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return item;
};

/* ================= SEARCH UTILITY ================= */

/**
 * Decide which field to search on (STRICT PRIORITY)
 */
const buildSearchCondition = (search) => {
  // 📞 Phone (10 digits)
  if (/^\d{10}$/.test(search)) {
    return {
      filter: "phone = :search",
      names: {},
      values: { ":search": search },
    };
  }

  // 🆔 Aadhaar (12 digits)
  if (/^\d{12}$/.test(search)) {
    return {
      filter: "aadhaar = :search",
      names: {},
      values: { ":search": search },
    };
  }

  // 🪪 PAN (STRICT FORMAT: ABCDE1234F)
  if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(search)) {
    return {
      filter: "normalized_pan = :search",
      names: {},
      values: { ":search": search },
    };
  }

  // 👤 Name (partial, normalized)
  return {
    filter: "contains(#normalized_name, :search)",
    names: { "#normalized_name": "normalized_name" },
    values: { ":search": search },
  };
};

/* ================= PAGINATION CORE ================= */

const paginatedScan = async ({
  filterExpression,
  expressionAttributeNames = {},
  expressionAttributeValues = {},
  page,
  search,
}) => {
  const offset = (page - 1) * LIMIT;

  let items = [];
  let scanned = 0;
  let totalCount = 0;
  let lastKey;

  let finalFilterExpression = filterExpression;
  let finalNames = { ...expressionAttributeNames };
  let finalValues = { ...expressionAttributeValues };

  // 🔍 SMART SEARCH (field decided dynamically)
  if (search) {
    const searchCondition = buildSearchCondition(search);

    finalFilterExpression = finalFilterExpression
      ? `${finalFilterExpression} AND ${searchCondition.filter}`
      : searchCondition.filter;

    finalNames = { ...finalNames, ...searchCondition.names };
    finalValues = { ...finalValues, ...searchCondition.values };
  }

  do {
    const res = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: finalFilterExpression,
        ExpressionAttributeNames: Object.keys(finalNames).length
          ? finalNames
          : undefined,
        ExpressionAttributeValues: Object.keys(finalValues).length
          ? finalValues
          : undefined,
        ExclusiveStartKey: lastKey,
      }),
    );

    for (const item of res.Items || []) {
      if (scanned >= offset && items.length < LIMIT) {
        items.push(item);
      }
      scanned++;
      totalCount++;
    }

    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return { items, totalCount };
};

/* ================= LIST ROUTES ================= */

exports.getAllKycCustomers = async (page) => {
  return paginatedScan({ page });
};

exports.getApprovedKycCustomers = async (page) => {
  return paginatedScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "approved" },
    page,
  });
};

exports.getPendingKycCustomers = async (page) => {
  return paginatedScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "pending" },
    page,
  });
};

/* ================= SEARCH ROUTES ================= */

exports.searchAllKycCustomers = async (page, search) => {
  return paginatedScan({ page, search });
};

exports.searchApprovedKycCustomers = async (page, search) => {
  return paginatedScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "approved" },
    page,
    search,
  });
};

exports.searchPendingKycCustomers = async (page, search) => {
  return paginatedScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "pending" },
    page,
    search,
  });
};

/* ================= OTHER OPS ================= */

exports.getKycById = async (customerId) => {
  const res = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    }),
  );

  return res.Item || null;
};

exports.approveKycCustomer = async (customerId) => {
  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "approved" },
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};

exports.deleteKycCustomer = async (customerId) => {
  const getRes = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    }),
  );

  const customer = getRes.Item;
  if (!customer) return null;

  const s3Keys = [
    customer.aadhaar_key,
    customer.pan_key,
    customer.voter_key,
    customer.other_key,
  ]
    .filter(Boolean)
    .map((key) => ({ Key: key }));

  if (s3Keys.length > 0) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: s3Keys, Quiet: true },
      }),
    );
  }

  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    }),
  );

  return customer;
};
