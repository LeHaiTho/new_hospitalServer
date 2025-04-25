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
  getUsers,
  getUserById,
  createUser,
  lockUser,
  updateUser,
} = require("../controllers/userController.js");
const { protect, restrictTo } = require("../middlewares/authMiddleware.js");

router.patch("/:id/lock", protect, restrictTo("admin"), lockUser);
router.get("/get-info-user/:id", getInfoUser);
router.post("/create-account", protect, restrictTo("admin"), createAccount);
router.put("/create-profile/:id", createProfile);
router.get("/get-profile", protect, getAllProfileOfUser);
router.get("/get-info-doctor/:id", getInfoDoctor);
router.patch("/update-user-profile", protect, updateUserProfile);
router.patch("/update-family-member/:id", protect, updateFamilyMember);
router.get("/get-users", protect, restrictTo("admin"), getUsers);
router.get("/get-user-by-id/:id", protect, restrictTo("admin"), getUserById);
router.post("/create-user", protect, restrictTo("admin"), createUser);
router.patch("/update-user/:id", protect, restrictTo("admin"), updateUser);
// router.delete("/users/:id", userController.deleteUser);
module.exports = router;
