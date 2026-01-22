const {
  BatchWriteCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const FLATS_TABLE = "project_flats";

exports.createProjectFlats = async (projectId, flats) => {
  const now = new Date().toISOString();

  const requests = flats.map((flat) => ({
    PutRequest: {
      Item: {
        projectId,
        flatId: `${flat.block}-${flat.floor}-${flat.flatno}`,
        block: flat.block,
        floor: flat.floor,
        flatno: flat.flatno,
        sqft: flat.sqft,
        bhk: flat.bhk,
        status: flat.status, // free / booked / sold
        createdAt: now,
      },
    },
  }));

  // DynamoDB batch limit = 25
  for (let i = 0; i < requests.length; i += 25) {
    await dynamoDB.send(
      new BatchWriteCommand({
        RequestItems: {
          [FLATS_TABLE]: requests.slice(i, i + 25),
        },
      }),
    );
  }

  return true;
};

exports.buildProjectStats = (flats) => {
  const totalApartments = flats.length;

  const blocks = new Set(flats.map((f) => f.block));

  let soldApartments = 0;
  let freeApartments = 0;
  let bookedApartments = 0;

  flats.forEach((f) => {
    if (f.status === "sold") soldApartments++;
    else if (f.status === "booked") bookedApartments++;
    else if (f.status === "free") freeApartments++;
  });

  return {
    totalApartments,
    totalBlocks: blocks.size,
    soldApartments,
    freeApartments,
    bookedApartments,
  };
};

exports.getFlatsByProjectId = async (projectId) => {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: FLATS_TABLE,
      KeyConditionExpression: "projectId = :projectId",
      ExpressionAttributeValues: {
        ":projectId": projectId,
      },
    }),
  );

  return result.Items || [];
};

exports.updateFlatStatus = async (projectId, flatId, status) => {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId,
        flatId,
      },
      UpdateExpression: "SET #st = :status",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return true;
};

exports.deleteFlatsByProjectId = async (projectId) => {
  const flats = await exports.getFlatsByProjectId(projectId);

  if (!flats.length) return true;

  const deleteRequests = flats.map((flat) => ({
    DeleteRequest: {
      Key: {
        projectId,
        flatId: flat.flatId,
      },
    },
  }));

  // DynamoDB batch limit = 25
  for (let i = 0; i < deleteRequests.length; i += 25) {
    await dynamoDB.send(
      new BatchWriteCommand({
        RequestItems: {
          [FLATS_TABLE]: deleteRequests.slice(i, i + 25),
        },
      }),
    );
  }

  return true;
};
