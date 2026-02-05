const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "wp_table";

exports.upsertPhoneDate = async (phone, date) => {
  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        phone,
        date,
      },
    }),
  );

  return true;
};
exports.getScheduleByPhone = async (phone) => {
  const res = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { phone },
    }),
  );

  return res.Item || null;
};

exports.deleteScheduleByPhone = async (phone) => {
  if (!phone) return true;

  try {
    await dynamoDB.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { phone },
        ConditionExpression: "attribute_exists(phone)",
      }),
    );
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      // item doesn't exist — ignore
      return true;
    }
    throw err;
  }

  return true;
};
