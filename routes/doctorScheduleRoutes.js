const express = require("express");
const {
  createDoctorSchedule,
  getAppointmentSlotsByDoctorInDay,
  getDoctorScheduleDays,
  getDoctorWorkplace,
  getDoctorScheduleBySpecialtyInHospital,
  getDoctorAllSchedule,
  check,
  getDoctorScheduleOfManager,
} = require("../controllers/doctorScheduleController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.post("/check", protect, check);
router.post("/create-schedule", protect, createDoctorSchedule);
router.get("/doctor/:doctorId/get-slots", getAppointmentSlotsByDoctorInDay);
router.get("/doctor/:doctorId/get-dates", getDoctorScheduleDays);
// router.get(
//   "/doctor/get-schedule-after-current-date",
//   protect,
//   getDoctorScheduleAfterCurrentDate
// );
router.get("/doctor/get-workplace", protect, getDoctorWorkplace);
router.get(
  "/doctor/get-schedule-by-specialty-and-hospital",
  getDoctorScheduleBySpecialtyInHospital
);
router.get("/get-all-schedule", protect, getDoctorAllSchedule);
router.get(
  "/doctor/:doctorId/get-all-schedules",
  protect,
  getDoctorScheduleOfManager
);

module.exports = router;
