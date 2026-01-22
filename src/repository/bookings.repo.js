const {
  PutCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");
const BOOKED_TABLE = "booked_flats";

exports.createBookedFlat = async ({
  projectId,
  flatId,
  customer_id,
  customer_name,
  totalPayment,
  paid,
}) => {
  await dynamoDB.send(
    new PutCommand({
      TableName: BOOKED_TABLE,
      Item: {
        projectId,
        flatId,
        customer_id,
        customer_name,
        totalPayment,
        paid,
        createdAt: new Date().toISOString(),
      },
    }),
  );
};

exports.getBookedFlat = async (projectId, flatId) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: BOOKED_TABLE,
      Key: { projectId, flatId },
    }),
  );

  return result.Item || null;
};

exports.incrementPaidAmount = async (projectId, flatId, amount) => {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: BOOKED_TABLE,
      Key: { projectId, flatId },
      UpdateExpression: "ADD paid :amt",
      ExpressionAttributeValues: {
        ":amt": amount,
      },
      ReturnValues: "ALL_NEW",
    }),
  );
};
