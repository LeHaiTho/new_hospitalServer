const express = require("express");
const {
  createPayment,
  callback,
  // createPackagePayment,
  // callbackPackagePayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-payment", createPayment);
router.post("/callback", callback);
// package
// router.post("/createPackagePayment", createPackagePayment);
// router.post("/callbackPackagePayment", callbackPackagePayment);

module.exports = router;
