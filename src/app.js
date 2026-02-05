const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const kycRoutes = require("./routes/kycRoutes");
const projectRoutes = require("./routes/projectRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const cancellationRoutes = require("./routes/cancellationRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

const app = express();
// CORS FIX
// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// );

app.use(express.json());

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/customer-kyc", kycRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/cancellations", cancellationRoutes);
app.use("/api/v1/schedule", scheduleRoutes);

module.exports = app;
