const {
  PutCommand,
  ScanCommand,
  DeleteCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "cancellation_app_voucher";

/* =========================
   Get Cancellation By ID
========================= */
exports.getCancellationById = async (id) => {
  try {
    const res = await dynamoDB.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { _id: id },
      }),
    );

    return res.Item || null;
  } catch (err) {
    throw new Error(`Get Cancellation Error: ${err.message}`);
  }
};

/* =========================
   Get All Cancellations by Invoice ID
========================= */
exports.getCancellationsByInvoiceId = async (invId) => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "inv_id = :invId",
        ExpressionAttributeValues: {
          ":invId": invId,
        },
      }),
    );

    return response.Items || [];
  } catch (err) {
    throw new Error(`Fetch Cancellation By Invoice Error: ${err.message}`);
  }
};

/* =========================
   Get ROOT Cancellation (lowest version)
========================= */
exports.getRootCancellationByAnyId = async (cancellationId) => {
  const current = await exports.getCancellationById(cancellationId);
  if (!current) return null;

  const all = await exports.getCancellationsByInvoiceId(current.inv_id);
  if (!all.length) return null;

  return all.reduce((root, c) => (c.version < root.version ? c : root));
};

/* =========================
   Get LATEST Cancellation (highest version)
========================= */
exports.getLatestCancellationByAnyIdFromAnyId = async (cancellationId) => {
  const current = await exports.getCancellationById(cancellationId);
  if (!current) return null;

  const all = await exports.getCancellationsByInvoiceId(current.inv_id);
  if (!all.length) return null;

  return all.reduce((latest, c) => (c.version > latest.version ? c : latest));
};

/* =========================
   Customer Summary
========================= */
exports.getCancellationCustomerSummary = async (cancellationId) => {
  try {
    const res = await dynamoDB.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { _id: cancellationId },
        ProjectionExpression:
          "customer.#n, customer.PAN, net_return, already_returned, yetTB_returned",
        ExpressionAttributeNames: {
          "#n": "name",
        },
      }),
    );

    return res.Item || null;
  } catch (err) {
    throw new Error(`Cancellation Summary Error: ${err.message}`);
  }
};
