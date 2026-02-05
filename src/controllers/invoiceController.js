const invoiceRepo = require("../repository/invoice.repo");
const flatsRepo = require("../repository/projectFlats.repo");
const scheduleRepo = require("../repository/wp.repo");

exports.attachInvoiceToFlat = async (req, res) => {
  try {
    const { invoiceId, projectId, flatId } = req.body;

    if (!invoiceId || !projectId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "invoiceId, projectId and flatId are required",
      });
    }

    // 1️⃣ Get latest invoice
    const latestInvoice = await invoiceRepo.getLatestInvoiceByAnyId(invoiceId);

    if (!latestInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // 2️⃣ Get root invoice
    const rootInvoice = await invoiceRepo.getRootInvoiceByAnyId(invoiceId);

    // 3️⃣ Extract financial values
    const totalAmount = Number(latestInvoice.totalAmount || 0);
    const advance = Number(latestInvoice.advance || 0);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid totalAmount in invoice",
      });
    }

    // 4️⃣ Decide flat status
    const isSold = advance >= totalAmount * 0.5;
    const status = isSold ? "sold" : "booked";

    // 5️⃣ Attach invoice + update status
    await flatsRepo.attachInvoiceAndUpdateStatus(
      projectId,
      flatId,
      latestInvoice._id,
      rootInvoice._id,
      status,
    );

    return res.status(200).json({
      success: true,
      message: "Invoice linked and flat status updated",
      flatStatus: status,
      latestInvoiceId: latestInvoice._id,
      rootInvoiceId: rootInvoice._id,
      financials: {
        totalAmount,
        advance,
        paidPercentage: ((advance / totalAmount) * 100).toFixed(2) + "%",
      },
    });
  } catch (err) {
    console.error("Attach Invoice Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getFlatCustomerInvoiceDetails = async (req, res) => {
  try {
    const { projectId, flatId } = req.params;

    if (!projectId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "projectId and flatId are required",
      });
    }

    // 1️⃣ Get flat → latestInvoiceId
    const flat = await flatsRepo.getFlatInvoiceDetails(projectId, flatId);

    if (!flat || !flat.latestInvoiceId) {
      return res.status(404).json({
        success: false,
        message: "No invoice linked to this flat",
      });
    }

    // 2️⃣ Get invoice summary
    const invoice = await invoiceRepo.getInvoiceCustomerSummary(
      flat.latestInvoiceId,
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        customerName: invoice.customer?.name || null,
        pan: invoice.customer?.PAN || null,
        totalAmount: invoice.totalAmount || 0,
        advance: invoice.advance || 0,
        customerPhone: invoice.customer?.phone || null,
      },
    });
  } catch (err) {
    console.error("Get Flat Invoice Details Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
exports.swapLatestInvoice = async (req, res) => {
  try {
    const { currentLatestInvoiceId, newLatestInvoiceId } = req.body;

    if (!currentLatestInvoiceId) {
      return res.status(400).json({
        success: false,
        message: "currentLatestInvoiceId is required",
      });
    }

    /**
     * 🔁 CASE 1: Detach invoice (make flat FREE)
     */
    if (newLatestInvoiceId === null) {
      await flatsRepo.detachInvoiceByCurrentInvoiceId(currentLatestInvoiceId);

      return res.status(200).json({
        success: true,
        message: "Invoice detached and flat marked as free",
        flatStatus: "free",
        latestInvoiceId: null,
        rootInvoiceId: null,
      });
    }

    /**
     * 🔁 CASE 2: Swap to a NEW invoice
     */
    const newInvoice = await invoiceRepo.getInvoiceById(newLatestInvoiceId);

    if (!newInvoice) {
      return res.status(404).json({
        success: false,
        message: "New latest invoice not found",
      });
    }

    const totalAmount = Number(newInvoice.totalAmount || 0);
    const advance = Number(newInvoice.advance || 0);

    const isSold = advance >= totalAmount * 0.5;
    let status = isSold ? "sold" : "booked";

    const check = await flatsRepo.getLoanApprovalStatus(currentLatestInvoiceId);

    if (check == true) {
      status = "sold";
    }
    await flatsRepo.updateLatestInvoiceByCurrentInvoiceId(
      currentLatestInvoiceId,
      newLatestInvoiceId,
      status,
    );

    return res.status(200).json({
      success: true,
      message: "Latest invoice and flat status updated successfully",
      flatStatus: status,
      latestInvoiceId: newLatestInvoiceId,
    });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return res.status(409).json({
        success: false,
        message: "Latest invoice mismatch. Update rejected.",
      });
    }

    if (err.message === "No flat found for currentLatestInvoiceId") {
      return res.status(200).json({
        success: true,
        message: "No flat linked to current latest invoice",
      });
    }

    console.error("Swap Latest Invoice Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteFlatInvoiceLink = async (req, res) => {
  try {
    const { projectId, flatId, phone } = req.body;

    if (!projectId || !flatId) {
      return res.status(400).json({
        success: false,
        message: "projectId and flatId are required",
      });
    }

    await scheduleRepo.deleteScheduleByPhone(phone);

    const updatedFlat = await flatsRepo.resetFlatToFree(projectId, flatId);

    return res.status(200).json({
      success: true,
      message: "Flat reset to FREE successfully",
      flat: {
        projectId: updatedFlat.projectId,
        flatId: updatedFlat.flatId,
        status: updatedFlat.status,
      },
    });
  } catch (err) {
    console.error("Reset Flat Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
