const {
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
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

exports.incrementProjectSoldCount = async (projectId) => {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: PROJECTS_TABLE,
      Key: {
        projectId,
      },
      UpdateExpression:
        "SET soldApartments = soldApartments + :one, bookedApartments = bookedApartments - :one",
      ExpressionAttributeValues: {
        ":one": 1,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return true;
};

exports.incrementProjectBookedCount = async (projectId) => {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: PROJECTS_TABLE,
      Key: {
        projectId,
      },
      UpdateExpression:
        "SET bookedApartments = bookedApartments + :one, freeApartments = freeApartments - :one",
      ExpressionAttributeValues: {
        ":one": 1,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return true;
};

exports.deleteProject = async (projectId) => {
  await dynamoDB.send(
    new DeleteCommand({
      TableName: PROJECTS_TABLE,
      Key: { projectId },
    }),
  );

  return true;
};
