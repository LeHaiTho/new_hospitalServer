const express = require("express");
const router = express.Router();
const {
  upload,
  createExamResult,
  getExamResultByAppointmentCode,
  getPatientExamHistory,
} = require("../controllers/detailedExamResultController");
const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

// Create detailed exam result with file uploads
router.post(
  "/create",
  authenticateToken,
  requireRole(["doctor"]), // Only doctors can create
  upload.array("testResultFiles", 10), // Max 10 files
  createExamResult
);

// Get detailed exam result by appointment code
router.get(
  "/appointment/:appointmentCode",
  authenticateToken,
  requireRole(["doctor", "staff", "customer"]), // Doctors and staff can view
  getExamResultByAppointmentCode
);

// Get all detailed exam results for a doctor
// router.get(
//   "/doctor/:doctorId",
//   authenticateToken,
//   requireRole(["doctor", "staff"]), // Doctors and staff can view
//   getExamResultHistoryOfDoctor
// );

// Get patient exam history
router.post(
  "/patient/history",
  authenticateToken,
  requireRole(["doctor", "staff"]), // Doctors and staff can view
  getPatientExamHistory
);

module.exports = router;
