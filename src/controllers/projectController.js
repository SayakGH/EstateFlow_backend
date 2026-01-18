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
