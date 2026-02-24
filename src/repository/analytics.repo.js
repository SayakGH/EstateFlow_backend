const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "kyc_customers";

/* ============================================================= */
/* ================= CORE COUNT SCAN (CUSTOMERS) =============== */
/* ============================================================= */

const countScan = async ({
  filterExpression,
  expressionAttributeNames,
  expressionAttributeValues,
}) => {
  let totalCount = 0;
  let lastKey;

  do {
    const res = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ExclusiveStartKey: lastKey,
        Select: "COUNT",
      }),
    );

    totalCount += res.Count || 0;
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return totalCount;
};

/* ============================================================= */
/* ================= ANALYTICS COUNTS (CUSTOMERS) ============== */
/* ============================================================= */

exports.countAllCustomers = async () => {
  return countScan({});
};

exports.countApprovedCustomers = async () => {
  return countScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "approved" },
  });
};

exports.countPendingCustomers = async () => {
  return countScan({
    filterExpression: "#status = :status",
    expressionAttributeNames: { "#status": "status" },
    expressionAttributeValues: { ":status": "pending" },
  });
};

/* ============================================================= */
/* ================= SALES SUMMARY (MANUAL COUNT) ============== */
/* ============================================================= */

const projectRepo = require("../repository/project.repo");
const projectFlatsRepo = require("../repository/projectFlats.repo");

exports.getSalesSummary = async () => {
  const projects = await projectRepo.getAllProjects();

  const totalProjects = projects.length;

  let totalApartments = 0;
  let freeApartments = 0;
  let bookedApartments = 0;
  let soldApartments = 0;

  const flatsPerProject = await Promise.all(
    projects.map((project) =>
      projectFlatsRepo.getFlatsByProjectId(project.projectId),
    ),
  );

  flatsPerProject.forEach((flats) => {
    totalApartments += flats.length;

    flats.forEach((flat) => {
      if (flat.status === "free") freeApartments++;
      else if (flat.status === "booked") bookedApartments++;
      else if (flat.status === "sold") soldApartments++;
    });
  });

  return {
    totalProjects,
    totalApartments,
    freeApartments,
    bookedApartments,
    soldApartments,
  };
};

/* ============================================================= */
/* ================= PROJECT LIST (DROPDOWN) =================== */
/* ============================================================= */

/**
 * Get all project IDs and names
 */
exports.getProjectList = async () => {
  return projectRepo.getProjectIdAndName();
};

/* ============================================================= */
/* ============ PROJECT-WISE FLAT STATUS SUMMARY =============== */
/* ============================================================= */

/**
 * Get flat summary for a specific project
 */
exports.getProjectFlatSummary = async (projectId) => {
  const flats = await projectFlatsRepo.getFlatsByProjectId(projectId);

  let totalApartments = flats.length;
  let freeApartments = 0;
  let bookedApartments = 0;
  let soldApartments = 0;

  flats.forEach((flat) => {
    if (flat.status === "free") freeApartments++;
    else if (flat.status === "booked") bookedApartments++;
    else if (flat.status === "sold") soldApartments++;
  });

  return {
    totalApartments,
    freeApartments,
    bookedApartments,
    soldApartments,
  };
};
