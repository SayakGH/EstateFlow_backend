const { S3Client } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION || "ap-south-1";

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const s3 = new S3Client({
  region: REGION,
  credentials,
});

module.exports = { s3 };
