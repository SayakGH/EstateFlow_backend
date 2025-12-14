const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

// 1. Create the Low-Level Client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 2. Create the Document Client (for easy JSON handling)
const dynamoDB = DynamoDBDocumentClient.from(client);

// 3. Export as an object to match your repo's destructuring:
// const { dynamoDB } = require(...)
module.exports = { dynamoDB };
