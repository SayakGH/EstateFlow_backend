const bookedFlatsRepo = require("../repository/bookings.repo");
const projectFlatsRepo = require("../repository/projectFlats.repo");
const flatPaymentsRepo = require("../repository/payments.repo");
const projectRepo = require("../repository/project.repo");

exports.bookFlatController = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;
    const { customer, amount, totalPayment, summary } = req.body;

    if (!customer || !amount || !totalPayment) {
      return res.status(400).json({
        success: false,
        message: "customer, amount, and totalPayment required",
      });
    }

    // 1) Create booked_flat entry
    await bookedFlatsRepo.createBookedFlat({
      projectId,
      flatId,
      customer_id: customer.id,
      customer_name: customer.name,
      totalPayment,
      paid: amount,
    });

    // 2) Update flat status → booked
    await projectFlatsRepo.updateFlatStatus(projectId, flatId, "booked");

    if (amount >= totalPayment * 0.5) {
      await projectFlatsRepo.updateFlatStatus(projectId, flatId, "sold");
      await projectRepo.incrementProjectSoldCount(projectId);
    } else {
      await projectRepo.incrementProjectBookedCount(projectId);
    }

    // 3) Create payment record
    await flatPaymentsRepo.addPayment({
      projectId,
      flatId,
      customer,
      amount,
      summary,
    });

    res.status(201).json({
      success: true,
      message: "Flat booked and payment recorded",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Booking failed" });
  }
};
exports.getBookedFlatController = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;

    const booked = await bookedFlatsRepo.getBookedFlat(projectId, flatId);

    if (!booked) {
      return res.status(404).json({
        success: false,
        message: "Flat is not booked",
      });
    }

    res.status(200).json({ success: true, booked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};
