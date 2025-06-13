const express = require("express");
const router = express.Router();
const {
  createManagerAccount,
  createProfile,
  getAllProfileOfUser,
  getInfoDoctor,
  getInfoUser,
  updateUserProfile,
  updateFamilyProfile,
  getListUserOfAdmin,
  getUserById,
  createUserOfAdmin,
  lockUserOfAdmin,
  updateUserOfAdmin,
  deleteFamilyMember,
} = require("../controllers/userController.js");
const { protect, restrictTo } = require("../middlewares/authMiddleware.js");

router.patch("/:id/lock", protect, restrictTo("admin"), lockUserOfAdmin);
router.get("/get-info-user/:id", getInfoUser);
router.post(
  "/create-account",
  protect,
  restrictTo("admin"),
  createManagerAccount
);
router.put("/create-profile/:id", createProfile);
router.get("/get-profile", protect, getAllProfileOfUser);
router.delete("/family-members/:id", protect, deleteFamilyMember);
router.get("/get-info-doctor/:id", getInfoDoctor);
router.patch("/update-user-profile", protect, updateUserProfile);
router.patch("/update-family-member/:id", protect, updateFamilyProfile);
router.get("/get-users", protect, restrictTo("admin"), getListUserOfAdmin);
router.get("/get-user-by-id/:id", protect, restrictTo("admin"), getUserById);
router.post("/create-user", protect, restrictTo("admin"), createUserOfAdmin);
router.patch(
  "/update-user/:id",
  protect,
  restrictTo("admin"),
  updateUserOfAdmin
);
module.exports = router;
