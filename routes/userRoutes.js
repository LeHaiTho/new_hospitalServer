const express = require("express");
const router = express.Router();
const {
  createAccount,
  activateAccount,
  createProfile,
  getAllProfileOfUser,
  getInfoDoctor,
  getInfoUser,
  updateUserProfile,
  updateFamilyMember,
} = require("../controllers/userController.js");
const { protect, restrictTo } = require("../middlewares/authMiddleware.js");

router.get("/get-info-user/:id", getInfoUser);
router.post("/create-account", protect, restrictTo("admin"), createAccount);
router.put("/create-profile/:id", createProfile);
router.get("/get-profile", protect, getAllProfileOfUser);
router.get("/get-info-doctor/:id", getInfoDoctor);
router.patch("/update-user-profile", protect, updateUserProfile);
router.patch("/update-family-member/:id", protect, updateFamilyMember);
module.exports = router;
