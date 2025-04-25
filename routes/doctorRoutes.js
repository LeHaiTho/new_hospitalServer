const express = require("express");
const {
  createDoctor,
  getDoctorOfHospital,
  getDoctorNameList,
  getAllDoctor,
  getDoctorDetail,
  filterDoctor,
  getDoctorById,
  getDoctorByLicenseCode,
  getAllDoctorOnline,
  getAllDoctorAdmin,
  updateDoctor1,
} = require("../controllers/doctorController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const router = express.Router();

router.get("/get-doctor-by-license-code", getDoctorByLicenseCode);
router.post("/create-doctor", protect, upload.single("image"), createDoctor);
router.post("/all-online", getAllDoctorOnline);
router.get("/list", protect, getDoctorOfHospital);
router.get("/name-list", protect, getDoctorNameList);
router.get("/all", getAllDoctor);
router.get("/:id", getDoctorDetail);
router.get("/filter", filterDoctor);
router.put(
  "/update-doctor/:id",
  protect,
  upload.single("image"),
  updateDoctor1
);
// lấy bác sĩ theo ID chỉ lấy name
router.get("/get-doctor-by-id/:id", getDoctorById);
router.get("/", getAllDoctorAdmin);
module.exports = router;
