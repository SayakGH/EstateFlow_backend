const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const kycRoutes = require("./routes/kycRoutes");
const projectRoutes = require("./routes/projectRoutes");
const paymentRoutes = require("./routes/paymentRoute");
const bookingRoutes = require("./routes/bookingRoute");

const app = express();
// CORS FIX
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/customer-kyc", kycRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/bookings", bookingRoutes);

module.exports = app;
