const express = require("express");
const {
  createProjectController,
  getAllProjectsController,
  getProjectFlatsController,
  fetchProjectIdAndName,
} = require("../controllers/projectController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", auth, createProjectController);
router.get("/", auth, getAllProjectsController);
router.get("/flats/:projectId", auth, getProjectFlatsController);
router.get("/projects-id-name", auth, fetchProjectIdAndName);

module.exports = router;
