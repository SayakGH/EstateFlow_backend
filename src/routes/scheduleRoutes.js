const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

router.post("/", scheduleController.upsertSchedule);
router.get("/:phone", scheduleController.getScheduleByPhone);

module.exports = router;
