const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "kyc_customers";

/* ================= CORE COUNT SCAN ================= */

/**
 * Generic count utility using DynamoDB Scan
 * (DynamoDB has no native COUNT query without scan)
 */
const countScan = async ({
  filterExpression,
  expressionAttributeNames,
  expressionAttributeValues,
}) => {
  let totalCount = 0;
  let lastKey;

  do {
    const res = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ExclusiveStartKey: lastKey,
        Select: "COUNT",
      }),
    );

    totalCount += res.Count || 0;
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return totalCount;
};

/* ================= ANALYTICS COUNTS ================= */

/**
 * 1️⃣ Total customers
 */
exports.countAllCustomers = async () => {
  return countScan({});
};

/**
 * 2️⃣ Approved customers
 */
exports.countApprovedCustomers = async () => {
  return countScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "approved" },
  });
};

/**
 * 3️⃣ Pending customers
 */
exports.countPendingCustomers = async () => {
  return countScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "pending" },
  });
};
