const { randomUUID } = require("crypto");
const projectRepo = require("../repository/project.repo");
const projectFlatsRepo = require("../repository/projectFlats.repo");

/**
 * POST /api/projects
 * Body:
 * {
 *   name: string,
 *   flats: Flat[]
 * }
 */
exports.createProjectController = async (req, res) => {
  try {
    const { name, flats } = req.body;

    // 1️⃣ Basic validation
    if (!name || !Array.isArray(flats) || flats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project name and flats are required",
      });
    }

    // 2️⃣ Generate projectId (slug or UUID)
    const projectId =
      name.toLowerCase().replace(/\s+/g, "-") + "-" + randomUUID().slice(0, 6);

    const stats = projectFlatsRepo.buildProjectStats(flats);

    const project = await projectRepo.createProject({
      projectId,
      name,
      totalApartments: stats.totalApartments,
      totalBlocks: stats.totalBlocks,
      soldApartments: stats.soldApartments,
      freeApartments: stats.freeApartments,
      bookedApartments: stats.bookedApartments,
    });

    // 5️⃣ Insert flats into separate table
    await projectFlatsRepo.createProjectFlats(projectId, flats);

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
};

exports.getAllProjectsController = async (req, res) => {
  try {
    const projects = await projectRepo.getAllProjects();

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

/**
 * GET /api/projects/:projectId/flats
 */
exports.getProjectFlatsController = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const flats = await projectFlatsRepo.getFlatsByProjectId(projectId);

    return res.status(200).json({
      success: true,
      flats,
    });
  } catch (error) {
    console.error("Get project flats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project flats",
    });
  }
};

exports.fetchProjectIdAndName = async (req, res) => {
  try {
    const projects = await projectRepo.getProjectIdAndName();

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

exports.approveLoanController = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;

    if (!projectId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "projectId and flatId are required",
      });
    }

    // 1️⃣ Mark flat as sold
    await projectFlatsRepo.updateFlatStatus(projectId, flatId, "sold");

    // 2️⃣ Increment project stats  approveLoanForFlat
    await projectFlatsRepo.approveLoanForFlat(projectId, flatId);

    return res.status(200).json({
      success: true,
      message: "Loan approved, flat sold, project stats updated",
    });
  } catch (error) {
    console.error("Approve loan error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve loan",
    });
  }
};

exports.deleteProjectController = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Delete flats first
    await projectFlatsRepo.deleteFlatsByProjectId(projectId);

    // Delete project itself
    await projectRepo.deleteProject(projectId);

    return res.status(200).json({
      success: true,
      message: "Project and apartments deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
};

exports.getFlatById = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;

    if (!projectId || !flatId) {
      return res.status(400).json({
        message: "projectId and flatId are required",
      });
    }

    const flat = await projectFlatsRepo.getFlatById(projectId, flatId);

    if (!flat) {
      return res.status(404).json({
        message: "Flat not found",
      });
    }

    return res.status(200).json(flat);
  } catch (error) {
    console.error("Get flat error:", error);
    return res.status(500).json({
      message: "Failed to fetch flat",
    });
  }
};
