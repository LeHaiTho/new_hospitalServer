const express = require("express");
const {
  createAppointment,
  getAppointmentsByUserId,
  getAllAppointmentsByHospitalId,
  updateAppointmentStatusById,
  getAppointmentById,
  getAppointmentSoon,
  getAppointmentNeedChange,
  suggestAppointment,
  changeAppointment,
  getAppointmentCompletedById,
  cancelAppointment,
  getAppointmentByIdByHospital,
  updateAppointmentStatusAfterPayment,
  deleteFamilyMember,
  getHistoryBookingOfHospital,
  updatePaymentStatus,
} = require("../controllers/apppointmentController");

const { protect, restrictTo } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/create-appointment", protect, createAppointment);
router.get(
  "/get-appointment-by-id-by-hospital/:id",
  getAppointmentByIdByHospital
);
router.get("/get-appointment-by-user-id", protect, getAppointmentsByUserId);

router.get(
  "/get-appointment-by-hospital-id",
  protect,
  restrictTo("staff"),
  getAllAppointmentsByHospitalId
);
router.patch(
  "/update-appointment-status/:id",
  protect,
  restrictTo("staff"),
  updateAppointmentStatusById
);
router.get(
  "/get-history-booking",
  protect,
  restrictTo("manager"),
  getHistoryBookingOfHospital
);
router.get("/get-appointment-by-id/:id", protect, getAppointmentById);
// router.get("/get-appointment-by-id/:id", getAppointmentById);
router.get("/soon", protect, getAppointmentSoon);
router.get("/get-appointment-need-change", protect, getAppointmentNeedChange);
router.post("/suggest-appointment", protect, suggestAppointment);
router.post("/change-appointment", protect, changeAppointment);
router.get(
  "/get-appointment-completed-by-id/:id?",
  protect,
  getAppointmentCompletedById
);
router.patch("/cancel-appointment/:id", protect, cancelAppointment);
router.patch(
  "/update-appointment-status-after-payment/:id",
  protect,
  updateAppointmentStatusAfterPayment
);
router.delete("/:id", protect, deleteFamilyMember);
router.patch("/update-payment-status/:id", protect, updatePaymentStatus);
module.exports = router;
