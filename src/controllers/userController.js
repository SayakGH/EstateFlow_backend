const userRepo = require("../repository/user.repo");

// GET /api/v1/users
exports.getAllNonAdminUsers = async (req, res) => {
  try {
    const users = await userRepo.getAllNonAdminUsers();

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("Get Users Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { _id, email } = req.body;

    // 1. Fetch user first to check ROLE (Security check)
    const user = await userRepo.findUserById(_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Prevent deleting Admins
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    // 3. Perform Delete (Verifying email matches via Repo)
    const isDeleted = await userRepo.deleteUserByIdAndEmail(_id, email);

    if (!isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found or email mismatch",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
