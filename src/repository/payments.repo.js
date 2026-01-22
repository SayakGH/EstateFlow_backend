const { v4: uuidv4 } = require("uuid");
const {
  PutCommand,
  QueryCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const { dynamoDB } = require("../config/dynamo");
const PAYMENTS_TABLE = "flat_payments";

/* ================= ADD PAYMENT ================= */
exports.addPayment = async ({
  projectId,
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
        timestamp, // ✅ For sorting in GSI
        projectId,
        flatId,
        customer,
        amount,
        summary,
        createdAt: timestamp,
      },
    }),
  );

  return paymentId;
};

/* ================= GET PAYMENT BY ID ================= */
exports.getPaymentById = async (paymentId) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: { paymentId },
    }),
  );

  return result.Item || null;
};

exports.getPaymentsByFlat = async (projectId, flatId) => {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: PAYMENTS_TABLE,
      IndexName: "projectFlatIndex",
      KeyConditionExpression: "projectFlatKey = :pk",
      ExpressionAttributeValues: {
        ":pk": `${projectId}#${flatId}`,
      },
      ScanIndexForward: false,
    }),
  );

  return result.Items || [];
};
