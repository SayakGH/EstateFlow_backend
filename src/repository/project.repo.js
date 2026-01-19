const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const PROJECTS_TABLE = "projects";

exports.createProject = async ({
  projectId,
  name,
  totalApartments,
  totalBlocks,
  soldApartments,
  freeApartments,
  bookedApartments,
}) => {
  const item = {
    projectId,
    name,
    totalApartments,
    totalBlocks,
    soldApartments,
    freeApartments,
    bookedApartments,
    createdAt: new Date().toISOString(),
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: PROJECTS_TABLE,
      Item: item,
    }),
  );

  return item;
};

/**
 * Get all projects
 */
exports.getAllProjects = async () => {
  const result = await dynamoDB.send(
    new ScanCommand({
      TableName: PROJECTS_TABLE,
    }),
  );

  return result.Items || [];
};

exports.getProjectIdAndName = async () => {
  const result = await dynamoDB.send(
    new ScanCommand({
      TableName: PROJECTS_TABLE,
      ProjectionExpression: "projectId, #n",
      ExpressionAttributeNames: {
        "#n": "name",
      },
    }),
  );

  return (result.Items || []).map((p) => ({
    id: p.projectId,
    name: p.name,
  }));
};
