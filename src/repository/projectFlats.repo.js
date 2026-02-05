const {
  BatchWriteCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
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
        loan_approved: false,
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
exports.getFlatById = async (projectId, flatId) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId,
        flatId,
      },
    }),
  );

  return result.Item || null;
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

exports.getFlatByLatestInvoiceId = async (currentLatestInvoiceId) => {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: FLATS_TABLE,
      IndexName: "latestInvoiceId-index",
      KeyConditionExpression: "latestInvoiceId = :lid",
      ExpressionAttributeValues: {
        ":lid": currentLatestInvoiceId,
      },
      Limit: 1,
    }),
  );

  return result.Items?.[0] || null;
};
exports.getFlatByLatestCancellationId = async (latestCancellationId) => {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: FLATS_TABLE,
      IndexName: "latestCancellationId-index",
      KeyConditionExpression: "latestCancellationId = :lid",
      ExpressionAttributeValues: {
        ":lid": latestCancellationId,
      },
      Limit: 1,
    }),
  );

  return result.Items?.[0] || null;
};

exports.getFlatInvoiceDetails = async (projectId, flatId) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: FLATS_TABLE,
      Key: { projectId, flatId },
      ProjectionExpression: "latestInvoiceId",
    }),
  );

  return result.Item || null;
};
exports.getFlatCancellationDetails = async (projectId, flatId) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: FLATS_TABLE,
      Key: { projectId, flatId },
      ProjectionExpression: "latestCancellationId",
    }),
  );

  return result.Item || null;
};

exports.updateLatestInvoiceByCurrentInvoiceId = async (
  currentLatestInvoiceId,
  newLatestInvoiceId,
  status,
) => {
  // 1️⃣ Find flat via GSI
  const flat = await exports.getFlatByLatestInvoiceId(currentLatestInvoiceId);

  if (!flat) {
    throw new Error("No flat found for currentLatestInvoiceId");
  }

  // 2️⃣ Atomic update (invoice + status)
  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId: flat.projectId,
        flatId: flat.flatId,
      },
      ConditionExpression: "latestInvoiceId = :current",
      UpdateExpression: "SET latestInvoiceId = :new, #st = :status",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":current": currentLatestInvoiceId,
        ":new": newLatestInvoiceId,
        ":status": status,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};

exports.updateLatestCancellationByCurrentInvoiceId = async (
  currentLatestCancellationId,
  newLatestCancellationId,
) => {
  // 1️⃣ Find flat via GSI
  const flat = await exports.getFlatByLatestInvoiceId(
    currentLatestCancellationId,
  );

  if (!flat) {
    throw new Error("No flat found for currentLatestCancellationId");
  }

  // 2️⃣ Atomic update (invoice + status)
  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId: flat.projectId,
        flatId: flat.flatId,
      },
      ConditionExpression: "latestCancellationId = :current",
      UpdateExpression: "SET latestCancellationId = :new",
      ExpressionAttributeValues: {
        ":new": newLatestCancellationId,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};

exports.attachInvoiceAndUpdateStatus = async (
  projectId,
  flatId,
  latestInvoiceId,
  rootInvoiceId,
  status,
) => {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: { projectId, flatId },
      UpdateExpression:
        "SET latestInvoiceId = :latest, rootInvoiceId = :root, #st = :status",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":latest": latestInvoiceId,
        ":root": rootInvoiceId,
        ":status": status,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return true;
};
exports.attachCancellation = async (
  projectId,
  flatId,
  latestCancellationId,
  rootCancellationId,
) => {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: { projectId, flatId },
      UpdateExpression:
        "SET latestCancellationId = :latest, rootCancellationId = :root",
      ExpressionAttributeValues: {
        ":latest": latestCancellationId,
        ":root": rootCancellationId,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return true;
};

exports.detachInvoiceByCurrentInvoiceId = async (currentLatestInvoiceId) => {
  // 1️⃣ Find flat using OLD invoice ID (VALID STRING)
  const flat = await exports.getFlatByLatestInvoiceId(currentLatestInvoiceId);

  if (!flat) {
    throw new Error("No flat found for currentLatestInvoiceId");
  }

  // 2️⃣ Update using PK (NO GSI here)
  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId: flat.projectId,
        flatId: flat.flatId,
      },
      ConditionExpression: "latestInvoiceId = :current",
      UpdateExpression:
        "SET #st = :status REMOVE latestInvoiceId, rootInvoiceId",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":current": currentLatestInvoiceId,
        ":status": "free",
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};

exports.detachCancellationByCurrentCancellationId = async (
  currentLatestCancellationId,
) => {
  // 1️⃣ Find flat using OLD invoice ID (VALID STRING)
  const flat = await exports.getFlatByLatestCancellationId(
    currentLatestCancellationId,
  );

  if (!flat) {
    throw new Error("No flat found for currentLatestCancellationId");
  }

  // 2️⃣ Update using PK (NO GSI here)
  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId: flat.projectId,
        flatId: flat.flatId,
      },
      ConditionExpression: "latestCancellationId = :current",
      UpdateExpression:
        "SET #st = :status REMOVE latestCancellationId, rootCancellationId",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":current": currentLatestCancellationId,
        ":status": "free",
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};

exports.updateLatestCancellationByCurrentCancellationId = async (
  currentLatestCancellationId,
  newLatestCancellationId,
) => {
  const flat = await exports.getFlatByLatestCancellationId(
    currentLatestCancellationId,
  );

  if (!flat) {
    throw new Error("No flat found for currentLatestCancellationId");
  }

  await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId: flat.projectId,
        flatId: flat.flatId,
      },
      UpdateExpression: "SET latestCancellationId = :newId",
      ExpressionAttributeValues: {
        ":newId": newLatestCancellationId,
      },
    }),
  );

  return true;
};

exports.resetFlatToFree = async (projectId, flatId) => {
  if (!projectId || !flatId) {
    throw new Error("projectId and flatId are required");
  }

  const result = await dynamoDB.send(
    new UpdateCommand({
      TableName: FLATS_TABLE,
      Key: {
        projectId,
        flatId,
      },
      UpdateExpression: "SET #st = :free REMOVE latestInvoiceId, rootInvoiceId",
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ExpressionAttributeValues: {
        ":free": "free",
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};

exports.approveLoanForFlat = async (projectId, flatId) => {
  if (!projectId || !flatId) {
    throw new Error("projectId and flatId are required");
  }

  try {
    const result = await dynamoDB.send(
      new UpdateCommand({
        TableName: FLATS_TABLE,
        Key: {
          projectId,
          flatId,
        },
        // 👇 Only allow update if loan_approved is false or missing
        ConditionExpression:
          "attribute_not_exists(loan_approved) OR loan_approved = :false",
        UpdateExpression: "SET loan_approved = :true",
        ExpressionAttributeValues: {
          ":true": true,
          ":false": false,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    return result.Attributes;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      throw new Error("Loan already approved for this flat");
    }
    throw err;
  }
};

exports.getLoanApprovalStatus = async (currentLatestInvoiceId) => {
  const flat = await exports.getFlatByLatestInvoiceId(currentLatestInvoiceId);

  if (!flat) {
    throw new Error("No flat found for currentLatestInvoiceId");
  }

  const projectId = flat.projectId;
  const flatId = flat.flatId;

  const result = await dynamoDB.send(
    new GetCommand({
      TableName: FLATS_TABLE,
      Key: { projectId, flatId },
      ProjectionExpression: "loan_approved",
    }),
  );

  return {
    loan_approved: result.Item?.loan_approved ?? false,
  };
};
