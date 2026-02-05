const cancellationRepo = require("../repository/cancellation.repo");
const flatsRepo = require("../repository/projectFlats.repo");
const invoiceRepo = require("../repository/invoice.repo");
const scheduleRepo = require("../repository/wp.repo");

exports.attachCancellationToFlat = async (req, res) => {
  try {
    const { cancellationId, projectId, flatId, phone } = req.body;

    if (!cancellationId || !projectId || !flatId || !phone) {
      return res.status(400).json({
        success: false,
        message: "cancellationId, projectId, flatId and phone are required",
      });
    }

    // const flat = await flatsRepo.getFlatById(projectId, flatId);

    await scheduleRepo.deleteScheduleByPhone(phone);

    // const can_root = await invoiceRepo.getRootInvoiceByAnyId(can.inv_id);

    // if (flat.rootInvoiceId !== can_root) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Cancellation Id miss match ${flat.rootInvoiceId} ${can_root} ${can.inv_id}`,
    //   });
    // }

    // 1️⃣ Get latest invoice
    const latestCan =
      await cancellationRepo.getLatestCancellationByAnyIdFromAnyId(
        cancellationId,
      );

    if (!latestCan) {
      return res.status(404).json({ message: "Cancellation not found" });
    }

    // 2️⃣ Get root invoice
    const rootCan =
      await cancellationRepo.getRootCancellationByAnyId(cancellationId);

    await flatsRepo.resetFlatToFree(projectId, flatId);

    // 5️⃣ Attach invoice + update status
    await flatsRepo.attachCancellation(
      projectId,
      flatId,
      latestCan._id,
      rootCan._id,
    );

    return res.status(200).json({
      success: true,
      message: "Cancellation linked and flat status updated",
    });
  } catch (err) {
    console.error("Attach Cancellation Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getFlatCustomerCancellationDetails = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;

    if (!projectId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "projectId and flatId are required",
      });
    }

    // 1️⃣ Get flat → latestInvoiceId
    const flat = await flatsRepo.getFlatCancellationDetails(projectId, flatId);

    if (!flat || !flat.latestCancellationId) {
      return res.status(404).json({
        success: false,
        message: "No cancellation linked to this flat",
      });
    }

    // 2️⃣ Get invoice summary
    const cancellation = await cancellationRepo.getCancellationCustomerSummary(
      flat.latestCancellationId,
    );

    if (!cancellation) {
      return res.status(404).json({
        success: false,
        message: "Cancellation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        customerName: cancellation.customer?.name || null,
        pan: cancellation.customer?.PAN || null,
        net_return: cancellation.net_return || 0,
        already_returned: cancellation.already_returned || 0,
        yetTB_returned: cancellation.yetTB_returned || 0,
      },
    });
  } catch (err) {
    console.error("Get Flat Cancellation Details Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.swapLatestCancellation = async (req, res) => {
  try {
    const { currentLatestCancellationId, newLatestCancellationId } = req.body;

    if (!currentLatestCancellationId) {
      return res.status(400).json({
        success: false,
        message: "currentLatestCancellationId is required",
      });
    }

    /**
     * 🔁 CASE 1: Detach cancellation (make flat FREE)
     */
    if (
      newLatestCancellationId === null ||
      newLatestCancellationId === undefined ||
      newLatestCancellationId === ""
    ) {
      const detached =
        await flatsRepo.detachCancellationByCurrentCancellationId(
          currentLatestCancellationId,
        );

      // if (!detached) {
      //   return res.status(404).json({
      //     success: false,
      //     message: "No flat linked to current latest cancellation",
      //   });
      // }

      return res.status(200).json({
        success: true,
        message: "Cancellation detached and flat marked as free",
        flatStatus: "free",
      });
    }

    /**
     * 🔁 CASE 2: Swap to a NEW cancellation
     */
    const newCancellation = await cancellationRepo.getCancellationById(
      newLatestCancellationId,
    );

    if (!newCancellation) {
      return res.status(404).json({
        success: false,
        message: "New latest cancellation not found",
      });
    }

    const updated =
      await flatsRepo.updateLatestCancellationByCurrentCancellationId(
        currentLatestCancellationId,
        newLatestCancellationId,
      );

    if (!updated) {
      return res.status(200).json({
        success: false,
        message: "No flat linked to current latest cancellation",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Latest cancellation updated successfully",
    });
  } catch (err) {
    if (err.message === "No flat found for currentLatestCancellationId") {
      return res.status(200).json({
        success: true,
        message: "No flat linked to current latest Cancellation",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};
