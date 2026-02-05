const {
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const generateInvoiceId = require("../utils/generateInvoiceId");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "Invoice_app_invoices";

const getLatestInvoiceByAnyId = async (invoiceId) => {
  const params = { TableName: TABLE_NAME };
  const result = await dynamoDB.send(new ScanCommand(params));
  const invoices = result.Items || [];

  const map = {};
  const referencedIds = new Set();

  for (const inv of invoices) {
    map[inv._id] = inv;
    if (inv.previousInvoiceId) {
      referencedIds.add(inv.previousInvoiceId);
    }
  }

  // Find chain start
  let current = map[invoiceId];
  if (!current) return null;

  // Move forward to latest
  while (true) {
    const next = invoices.find((i) => i.previousInvoiceId === current._id);
    if (!next) break;
    current = next;
  }

  return current;
};

const getRootInvoiceByAnyId = async (invoiceId) => {
  const params = { TableName: TABLE_NAME };
  const result = await dynamoDB.send(new ScanCommand(params));
  const invoices = result.Items || [];

  const map = {};
  for (const inv of invoices) {
    map[inv._id] = inv;
  }

  let current = map[invoiceId];
  if (!current) return null;

  while (current.previousInvoiceId) {
    current = map[current.previousInvoiceId];
  }

  return current;
};

const getInvoiceCustomerSummary = async (invoiceId) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { _id: invoiceId },
      ProjectionExpression:
        "customer.#n, customer.PAN, customer.phone, totalAmount, advance",
      ExpressionAttributeNames: {
        "#n": "name",
      },
    }),
  );

  return result.Item || null;
};

const getInvoiceById = async (id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      _id: id,
    },
  };

  try {
    const command = new GetCommand(params);
    const result = await dynamoDB.send(command);

    // If no item exists, return null
    return result.Item || null;
  } catch (err) {
    throw new Error(`DynamoDB Get Error: ${err.message}`);
  }
};

module.exports = {
  getLatestInvoiceByAnyId,
  getRootInvoiceByAnyId,
  getInvoiceCustomerSummary,
  getInvoiceById,
};
