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

/**
 * 🔍 Check duplicate customer
 * Block ONLY if both phone AND normalized_name match
 */
exports.checkDuplicateCustomer = async ({ phone, normalized_name }) => {
  const result = await dynamoDB.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression:
        "phone = :phone AND normalized_name = :normalized_name",
      ExpressionAttributeValues: {
        ":phone": phone,
        ":normalized_name": normalized_name,
      },
    })
  );

  return result.Items && result.Items.length > 0;
};

/**
 * ➕ Create KYC
 */
exports.createKyc = async ({
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
}) => {
  const item = {
    _id: customerId,
    name,
    normalized_name,
    phone,
    address,
    aadhaar,
    pan,
    voter_id: voter || "",
    other_id: other || "",
    aadhaar_key: aadhaarKey,
    pan_key: panKey,
    voter_key: voterKey || "",
    other_key: otherKey || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
};

exports.getAllKycCustomers = async () => {
  const result = await dynamoDB.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );

  return result.Items || [];
};

exports.getKycById = async (customerId) => {
  const res = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    })
  );

  return res.Item || null;
};

exports.approveKycCustomer = async (customerId) => {
  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "approved",
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes;
};

exports.deleteKycCustomer = async (customerId) => {
  const getRes = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    })
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
        Delete: {
          Objects: s3Keys,
          Quiet: true,
        },
      })
    );
  }

  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    })
  );

  return customer;
};
