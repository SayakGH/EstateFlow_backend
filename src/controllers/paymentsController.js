const bookedFlatsRepo = require("../repository/bookings.repo");
const flatPaymentsRepo = require("../repository/payments.repo");
const projectRepo = require("../repository/project.repo");
const projectFlatsRepo = require("../repository/projectFlats.repo");
exports.addPaymentController = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;
    const { amount, summary } = req.body;

    // 1) Get booked flat
    const booked = await bookedFlatsRepo.getBookedFlat(projectId, flatId);

    if (!booked) {
      return res.status(404).json({
        success: false,
        message: "Flat is not booked",
      });
    }
    const flat = await projectFlatsRepo.getFlatById(projectId, flatId);
    // 2) Check payment limit
    const newPaid = booked.paid + amount;

    if (newPaid > booked.totalPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment exceeds total amount",
      });
    }

    // 3) Update paid amount
    await bookedFlatsRepo.incrementPaidAmount(projectId, flatId, amount);

    const projectName = await projectRepo.getProjectNameById(projectId);

    // 4) Add payment record
    await flatPaymentsRepo.addPayment({
      projectId,
      projectName,
      flatId,
      customer: { id: booked.customer_id, name: booked.customer_name },
      amount,
      summary,
    });

    if (newPaid >= booked.totalPayment * 0.5 && flat.status !== "sold") {
      await projectRepo.incrementProjectSoldCount(projectId);
      await projectFlatsRepo.updateFlatStatus(projectId, flatId, "sold");
    }

    res.status(200).json({
      success: true,
      message: "Payment added",
      paid: newPaid,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Payment failed" });
  }
};

exports.getFlatPaymentHistoryController = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;

    if (!projectId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "projectId and flatId are required",
      });
    }

    const payments = await flatPaymentsRepo.getPaymentsByFlat(
      projectId,
      flatId,
    );

    return res.status(200).json({
      success: true,
      payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await flatPaymentsRepo.getAllPayments();

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get all payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};
