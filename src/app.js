const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const kycRoutes = require("./routes/kycRoutes");
const projectRoutes = require("./routes/projectRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const cancellationRoutes = require("./routes/cancellationRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes"); // ✅ ADD THIS

const app = express();

/* ======================
   CORS CONFIG
====================== */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ======================
   MIDDLEWARE
====================== */
app.use(express.json());

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ======================
   HEALTH CHECK
====================== */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ======================
   API ROUTES
====================== */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/customer-kyc", kycRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/cancellations", cancellationRoutes);
app.use("/api/v1/schedule", scheduleRoutes);
app.use("/api/v1/analytics", analyticsRoutes); // ✅ ADD THIS

module.exports = app;
