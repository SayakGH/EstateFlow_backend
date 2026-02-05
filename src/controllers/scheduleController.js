const scheduleRepo = require("../repository/wp.repo");

exports.upsertSchedule = async (req, res) => {
  try {
    const { phone, date } = req.body;

    if (!phone || !date) {
      return res.status(400).json({
        success: false,
        message: "phone and date are required",
      });
    }

    // YYYY-MM-DD validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    await scheduleRepo.upsertPhoneDate(phone, date);

    return res.status(200).json({
      success: true,
      message: "Schedule saved successfully",
      data: { phone, date },
    });
  } catch (err) {
    console.error("Upsert Schedule Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getScheduleByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "phone is required",
      });
    }

    const schedule = await scheduleRepo.getScheduleByPhone(phone);

    // if (!schedule) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "No schedule found for this phone",
    //   });
    // }

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    console.error("Get Schedule Error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
