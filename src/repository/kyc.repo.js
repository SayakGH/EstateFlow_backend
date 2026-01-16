const {
  PutCommand,
  ScanCommand,
  UpdateCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");
const { s3 } = require("../config/s3bucket");
const BUCKET_NAME = "realestate-kyc-documents";
const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");

const TABLE_NAME = "kyc_customers";

exports.createKyc = async ({
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
}) => {
  const item = {
    _id: customerId,
    name,
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

exports.approveKycCustomer = async (customerId) => {
  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      _id: customerId,
    },
    UpdateExpression: "SET #status = :status",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":status": "approved",
    },
    ReturnValues: "ALL_NEW",
  });

  const result = await dynamoDB.send(command);
  return result.Attributes;
};

exports.getKycById = async (customerId) => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { _id: customerId },
  });

  const res = await dynamoDB.send(command);
  return res.Item || null;
};

exports.deleteKycCustomer = async (customerId) => {
  // 1️⃣ Fetch customer first
  const getRes = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    })
  );

  const customer = getRes.Item;
  if (!customer) return null;

  // 2️⃣ Collect S3 object keys
  const s3Keys = [
    customer.aadhaar_key,
    customer.pan_key,
    customer.voter_key,
    customer.other_key,
  ]
    .filter(Boolean) // remove empty / undefined
    .map((key) => ({ Key: key }));

  // 3️⃣ Delete files from S3 (if any exist)
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

  // 4️⃣ Delete DynamoDB record
  await dynamoDB.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { _id: customerId },
    })
  );

  // 5️⃣ Return deleted customer (for audit / response)
  return customer;
};
