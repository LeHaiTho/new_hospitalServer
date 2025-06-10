const express = require("express");
const {
  createDoctor,
  getDoctorOfManager,
  getDoctorNameListOfManager,
  getAllDoctor,
  getDoctorDetailById,
  getNameDoctorById,
  getDoctorByLicenseCode,
  getAllDoctorOnline,
  getAllDoctorAdmin,
  updateDoctor,
} = require("../controllers/doctorController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const router = express.Router();

router.get("/get-doctor-by-license-code", getDoctorByLicenseCode);
router.post("/create-doctor", protect, upload.single("image"), createDoctor);
router.post("/all-online", getAllDoctorOnline);
router.get("/list", protect, getDoctorOfManager);
router.get("/name-list", protect, getDoctorNameListOfManager);
router.get("/all", getAllDoctor);
router.get("/:id", getDoctorDetailById);
// router.get("/filter", filterDoctor);
router.put("/update-doctor/:id", protect, upload.single("image"), updateDoctor);
router.get("/get-doctor-by-id/:id", getNameDoctorById);
router.get("/", getAllDoctorAdmin);
module.exports = router;
