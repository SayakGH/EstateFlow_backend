const { v4: uuidv4 } = require("uuid");
const {
  PutCommand,
  QueryCommand,
  GetCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const { dynamoDB } = require("../config/dynamo");

const PAYMENTS_TABLE = "flat_payments";
const LIMIT = 2; // ✅ Backend pagination limit

/* ================= ADD PAYMENT ================= */
exports.addPayment = async ({
  projectId,
  projectName,
  flatId,
  customer,
  amount,
  summary,
}) => {
  const paymentId = uuidv4();
  const timestamp = new Date().toISOString();

  await dynamoDB.send(
    new PutCommand({
      TableName: PAYMENTS_TABLE,
      Item: {
        paymentId, // ✅ PK
        projectFlatKey: `${projectId}#${flatId}`, // ✅ For GSI queries
        projectId,
        projectName,
        flatId,
        customer,
        amount,
        summary,
        createdAt: timestamp,
      },
    })
  );

  return paymentId;
};

/* ================= GET PAYMENT BY ID ================= */
exports.getPaymentById = async (paymentId) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: { paymentId },
    })
  );

  return result.Item || null;
};

/* ================= GET PAYMENTS BY FLAT ================= */
exports.getPaymentsByFlat = async (projectId, flatId) => {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: PAYMENTS_TABLE,
      IndexName: "projectFlatIndex",
      KeyConditionExpression: "projectFlatKey = :pk",
      ExpressionAttributeValues: {
        ":pk": `${projectId}#${flatId}`,
      },
      ScanIndexForward: false, // newest first
    })
  );

  return result.Items || [];
};

/* ================= GET ALL PAYMENTS (PAGINATED) ================= */
/**
 * Admin dashboard route
 * Offset-like pagination using DynamoDB Scan
 */
exports.getAllPayments = async (page = 1) => {
  const offset = (page - 1) * LIMIT;

  let items = [];
  let scanned = 0;
  let totalCount = 0;
  let lastKey = undefined;

  do {
    const params = {
      TableName: PAYMENTS_TABLE,
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await dynamoDB.send(new ScanCommand(params));

    for (const payment of result.Items || []) {
      if (scanned >= offset && items.length < LIMIT) {
        items.push(payment);
      }

      scanned++;
      totalCount++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // ✅ Sort newest first (inside current page)
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    payments: items,
    totalCount,
    totalPages: Math.ceil(totalCount / LIMIT),
    currentPage: page,
  };
};

/* ================= SEARCH PAYMENTS (PAGINATED) ================= */
/**
 * Search by:
 * - paymentId
 * - customer name
 * - projectName
 * - projectId
 * - flatId
 *
 * Returns paginated result
 */
exports.searchPayments = async (query, page = 1) => {
  const offset = (page - 1) * LIMIT;

  let items = [];
  let scanned = 0;
  let totalCount = 0;
  let lastKey = undefined;

  // Normalize query
  const search = query.toLowerCase();

  do {
    const params = {
      TableName: PAYMENTS_TABLE,

      // ✅ Filter Expression for Search
      FilterExpression: `
        contains(paymentId, :q)
        OR contains(projectId, :q)
        OR contains(projectName, :q)
        OR contains(flatId, :q)
        OR contains(customer.#name, :q)
      `,

      ExpressionAttributeNames: {
        "#name": "name",
      },

      ExpressionAttributeValues: {
        ":q": search,
      },
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await dynamoDB.send(new ScanCommand(params));

    for (const payment of result.Items || []) {
      if (scanned >= offset && items.length < LIMIT) {
        items.push(payment);
      }

      scanned++;
      totalCount++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // ✅ Sort newest first
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    payments: items,
    totalCount,
    totalPages: Math.ceil(totalCount / LIMIT),
    currentPage: page,
  };
};
