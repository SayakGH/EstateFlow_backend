const express = require("express");
const {
  createProjectController,
  getAllProjectsController,
  getProjectFlatsController,
  fetchProjectIdAndName,
  approveLoanController,
  deleteProjectController,
} = require("../controllers/projectController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", auth, createProjectController);
router.get("/", auth, getAllProjectsController);
router.get("/flats/:projectId", auth, getProjectFlatsController);
router.get("/projects-id-name", auth, fetchProjectIdAndName);

router.put(
  "/:projectId/flats/:flatId/approve-loan",
  auth,
  approveLoanController,
);
router.delete("/:projectId", auth, deleteProjectController);

module.exports = router;
