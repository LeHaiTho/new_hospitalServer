const express = require("express");
const router = express.Router();
const {
  upload,
  createDetailedExamResult,
  getDetailedExamResultByAppointmentCode,
  getDoctorDetailedExamResults,
  getPatientExamHistory,
  updateDetailedExamResult,
  deleteDetailedExamResult,
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
  createDetailedExamResult
);

// Get detailed exam result by appointment code
router.get(
  "/appointment/:appointmentCode",
  authenticateToken,
  requireRole(["doctor", "staff", "customer"]), // Doctors and staff can view
  getDetailedExamResultByAppointmentCode
);

// Get all detailed exam results for a doctor
router.get(
  "/doctor/:doctorId",
  authenticateToken,
  requireRole(["doctor", "staff"]), // Doctors and staff can view
  getDoctorDetailedExamResults
);

// Get patient exam history
router.post(
  "/patient/history",
  authenticateToken,
  requireRole(["doctor", "staff"]), // Doctors and staff can view
  getPatientExamHistory
);

// Update detailed exam result (only if not completed)
router.put(
  "/:id",
  authenticateToken,
  requireRole(["doctor"]), // Only doctors can update
  updateDetailedExamResult
);

// Delete detailed exam result (soft delete)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["doctor"]), // Only doctors can delete
  deleteDetailedExamResult
);

module.exports = router;
