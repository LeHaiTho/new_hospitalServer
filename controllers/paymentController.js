require("dotenv").config({ path: "../.env" });
const sequelize = require("../config/database");

const { ACCESS_KEY, SECRET_KEY } = process.env;
const crypto = require("crypto");
const Hospital = require("../models/hospitalModel");
const Appointment = require("../models/appointmentModel");

const {
  createNewAppointmentNotification,
} = require("./notificationController");
const axios = require("axios").default; // npm install axios
const CryptoJS = require("crypto-js"); // npm install crypto-js
const moment = require("moment"); // npm install moment
const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

// Giả lập database (thay bằng model Sequelize/MongoDB thực tế)
// const Appointment = {
//   update: async (data, options) => {
//     console.log("Updating appointment:", data, options);
//     // Thay bằng logic cập nhật thực tế
//   },
// };

const createPayment = async (req, res) => {
  const { appointment } = req.body;
  const embed_data = { redirecturl: "hospital-lht://paymentsuccess" };
  const items = [{ ...appointment }];
  const transID = [appointment.id];
  const app_trans_id = `${moment().format("YYMMDD")}_${transID}`;

  const order = {
    app_id: config.app_id,
    app_trans_id,
    app_user: "user123",
    app_time: Date.now(),
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: appointment.amount,
    description: `Thanh toán lịch hẹn #${transID}`,
    bank_code: "zalopayapp",
    callback_url:
      "https://9d5e-42-117-101-133.ngrok-free.app/payments/callback",
  };

  const data =
    config.app_id +
    "|" +
    order.app_trans_id +
    "|" +
    order.app_user +
    "|" +
    order.amount +
    "|" +
    order.app_time +
    "|" +
    order.embed_data +
    "|" +
    order.item;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    const result = await axios.post(config.endpoint, null, { params: order });
    // console.log("result", result.data);
    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.log("error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const callback = async (req, res) => {
  let result = {};

  try {
    const dataStr = req.body.data; // Chuỗi JSON gốc từ ZaloPay
    const reqMac = req.body.mac;

    // Tính MAC từ chuỗi gốc
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    // console.log("Generated mac:", mac);
    // console.log("Received mac:", reqMac);

    // Kiểm tra MAC
    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
      console.log("Invalid callback:", result);
    }
    // Parse dữ liệu callback
    // const dataJson = JSON.parse(dataStr);
    // console.log("Callback data:", dataJson);

    // // Parse item để lấy thông tin appointment
    // const items = JSON.parse(dataJson.item); // item là chuỗi JSON, cần parse lại
    // const appointmentData = items[0]; // Lấy appointment đầu tiên
    // console.log("Appointment data:", appointmentData);
    // console.log("appointmentData.id", appointmentData.id);
    // // Cập nhật trạng thái appointment trong database
    // await Appointment.update(
    //   { status: "confirmed", payment_status: "paid" },
    //   { where: { id: appointmentData.id } }
    // );
    console.log("dataStr", dataStr);

    // (Tùy chọn) Tạo thông báo nếu cần
    // const hospitalName = await Hospital.findOne({ where: { id: appointmentData.hospital_id } });
    // await createNewAppointmentNotification(
    //   appointmentData.user_id,
    //   appointmentData.id,
    //   hospitalName.name,
    //   moment(appointmentData.appointment_date).format("DD/MM/YYYY")
    // );
    // ---------------------------------------------------
    const dataJson = JSON.parse(dataStr);
    console.log("Callback data:", dataJson);

    // Parse item để lấy thông tin appointment
    const items = JSON.parse(dataJson.item); // item là chuỗi JSON, cần parse lại
    const appointmentData = items[0]; // Lấy appointment đầu tiên
    console.log("Appointment data:", appointmentData);
    console.log("appointmentData.id", appointmentData.id);
    // Cập nhật trạng thái appointment trong database
    // const updateAppointment = await Appointment.update(
    //   { payment_status: "paid" },
    //   { where: { id: appointmentData.id } }
    // );
    result.return_code = 1;
    result.return_message = "success";
    console.log(
      "Updated order status to SUCCESS for app_trans_id:",
      dataJson.app_trans_id
    );
  } catch (ex) {
    result.return_code = 0; // ZaloPay sẽ thử lại
    result.return_message = ex.message;
    console.error("Callback error:", ex.message);
  }

  // Trả kết quả cho ZaloPay
  res.json(result);
};

module.exports = { createPayment, callback };

// -----------------------------------------------momo-----------------------------------------------
// const createPayment = async (req, res) => {
//   const { appointment } = req.body;
//   // console.log("ddddddddddddddddddddddddddddddddddddd", req.body);
//   var orderInfo = "Thanh toán lịch hẹn";
//   var partnerCode = "MOMO";
//   var redirectUrl = "hospital-lht://paymentsuccess";
//   var ipnUrl =
//     "https://0efb-14-237-163-166.ngrok-free.app/payments/callbackPayment";
//   var requestType = "captureWallet";
//   // var amount = appointment.amount;
//   var amount = 100000;
//   var orderId = partnerCode + new Date().getTime();
//   var requestId = orderId;
//   const extraData = JSON.stringify({
//     appointment,
//   });
//   console.log("extraData", extraData);
//   var paymentCode =
//     "T8Qii53fAXyUftPV3m9ysyRhEanUs9KlOPfHgpMR0ON50U10Bh+vZdpJU7VY4z+Z2y77fJHkoDc69scwwzLuW5MzeUKTwPo3ZMaB29imm6YulqnWfTkgzqRaion+EuD7FN9wZ4aXE1+mRt0gHsU193y+yxtRgpmY7SDMU9hCKoQtYyHsfFR5FUAOAKMdw2fzQqpToei3rnaYvZuYaxolprm9+/+WIETnPUDlxCYOiw7vPeaaYQQH0BF0TxyU3zu36ODx980rJvPAgtJzH1gUrlxcSS1HQeQ9ZaVM1eOK/jl8KJm6ijOwErHGbgf/hVymUQG65rHU2MWz9U8QUjvDWA==";
//   var orderGroupId = "";
//   var autoCapture = true;
//   var lang = "vi";
//   //before sign HMAC SHA256 with format
//   //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
//   var rawSignature =
//     "accessKey=" +
//     ACCESS_KEY +
//     "&amount=" +
//     amount +
//     "&extraData=" +
//     extraData +
//     "&ipnUrl=" +
//     ipnUrl +
//     "&orderId=" +
//     orderId +
//     "&orderInfo=" +
//     orderInfo +
//     "&partnerCode=" +
//     partnerCode +
//     "&redirectUrl=" +
//     redirectUrl +
//     "&requestId=" +
//     requestId +
//     "&requestType=" +
//     requestType;
//   //puts raw signature
//   console.log("--------------------RAW SIGNATURE----------------");
//   console.log(rawSignature);
//   //signature
//   const crypto = require("crypto");
//   var signature = crypto
//     .createHmac("sha256", SECRET_KEY)
//     .update(rawSignature)
//     .digest("hex");
//   console.log("--------------------SIGNATURE----------------");
//   console.log(signature);

//   //json object send to MoMo endpoint
//   const requestBody = JSON.stringify({
//     partnerCode: partnerCode,
//     partnerName: "Test",
//     storeId: "MomoTestStore",
//     requestId: requestId,
//     amount: amount,
//     orderId: orderId,
//     orderInfo: orderInfo,
//     redirectUrl: redirectUrl,
//     ipnUrl: ipnUrl,
//     lang: lang,
//     requestType: requestType,
//     autoCapture: autoCapture,
//     extraData: extraData,
//     orderGroupId: orderGroupId,
//     signature: signature,
//   });
//   //Create the HTTPS objects
//   const options = {
//     method: "POST",
//     url: "https://test-payment.momo.vn/v2/gateway/api/create",
//     headers: {
//       "Content-Type": "application/json",
//       "Content-Length": Buffer.byteLength(requestBody),
//     },
//     data: requestBody,
//   };
//   let result;
//   try {
//     result = await axios(options);
//     res.status(200).json(result.data);
//   } catch (error) {
//     console.log(error);
//   }
// };
// const generateSignature = (rawSignature) => {
//   return crypto
//     .createHmac("sha256", process.env.SECRET_KEY)
//     .update(rawSignature)
//     .digest("hex");
// };
// const callbackPayment = async (req, res) => {
//   const { orderId } = req.body;
//   const appointment = JSON.parse(req.body.extraData).appointment;
//   console.log(
//     "appointmentdddddddddddddddddddddddddddddddddddddddd",
//     appointment
//   );
//   const rawSignature = `accessKey=${ACCESS_KEY}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;
//   const signature = generateSignature(rawSignature);
//   try {
//     const requestBody = JSON.stringify({
//       partnerCode: "MOMO",
//       requestId: orderId,
//       orderId,
//       signature,
//       lang: "vi",
//     });
//     const options = {
//       method: "POST",
//       url: "https://test-payment.momo.vn/v2/gateway/api/query",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       data: requestBody,
//     };
//     const result = await axios(options);
//     console.log("result.data.resultCode", result.data.resultCode);
//     console.log("appointment.id", appointment.id);
//     if (result.data.resultCode === 0) {
//       await Appointment.update(
//         { status: "confirmed", payment_status: "paid" },
//         { where: { id: appointment.id } }
//       );
//       const hospitalName = await Hospital.findOne({
//         where: {
//           id: appointment.hospital_id,
//         },
//       });
//       // await createNewAppointmentNotification(
//       //   appointment.user_id,
//       //   appointment.id,
//       //   hospitalName.name,
//       //   moment(appointment.appointment_date).format("DD/MM/YYYY")
//       // );

//       return res.status(200).json({ success: true, data: result.data });
//     } else {
//       console.log("Payment failed", result.data);
//       return res
//         .status(400)
//         .json({ success: false, message: "Payment failed", data: result.data });
//     }
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// Thanh toán Package
// const createPackagePayment = async (req, res) => {
//   const { package } = req.body;
//   console.log("package", package);
//   var orderInfo = "Thanh toán lịch hẹn";
//   var partnerCode = "MOMO";
//   var redirectUrl = "exp://hospital-lht";
//   var ipnUrl =
//     "https://a660-14-164-38-239.ngrok-free.app/payments/callbackPackagePayment";
//   var requestType = "captureWallet";
//   var amount = package.price;
//   var orderId = partnerCode + new Date().getTime();
//   var requestId = orderId;
//   const extraData = JSON.stringify({
//     packageId: package,
//   });
//   var paymentCode =
//     "T8Qii53fAXyUftPV3m9ysyRhEanUs9KlOPfHgpMR0ON50U10Bh+vZdpJU7VY4z+Z2y77fJHkoDc69scwwzLuW5MzeUKTwPo3ZMaB29imm6YulqnWfTkgzqRaion+EuD7FN9wZ4aXE1+mRt0gHsU193y+yxtRgpmY7SDMU9hCKoQtYyHsfFR5FUAOAKMdw2fzQqpToei3rnaYvZuYaxolprm9+/+WIETnPUDlxCYOiw7vPeaaYQQH0BF0TxyU3zu36ODx980rJvPAgtJzH1gUrlxcSS1HQeQ9ZaVM1eOK/jl8KJm6ijOwErHGbgf/hVymUQG65rHU2MWz9U8QUjvDWA==";
//   var orderGroupId = "";
//   var autoCapture = true;
//   var lang = "vi";
//   //before sign HMAC SHA256 with format
//   //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
//   var rawSignature =
//     "accessKey=" +
//     ACCESS_KEY +
//     "&amount=" +
//     amount +
//     "&extraData=" +
//     extraData +
//     "&ipnUrl=" +
//     ipnUrl +
//     "&orderId=" +
//     orderId +
//     "&orderInfo=" +
//     orderInfo +
//     "&partnerCode=" +
//     partnerCode +
//     "&redirectUrl=" +
//     redirectUrl +
//     "&requestId=" +
//     requestId +
//     "&requestType=" +
//     requestType;
//   //puts raw signature
//   console.log("--------------------RAW SIGNATURE----------------");
//   console.log(rawSignature);
//   //signature
//   const crypto = require("crypto");
//   var signature = crypto
//     .createHmac("sha256", SECRET_KEY)
//     .update(rawSignature)
//     .digest("hex");
//   console.log("--------------------SIGNATURE----------------");
//   console.log(signature);

//   //json object send to MoMo endpoint
//   const requestBody = JSON.stringify({
//     partnerCode: partnerCode,
//     partnerName: "Test",
//     storeId: "MomoTestStore",
//     requestId: requestId,
//     amount: amount,
//     orderId: orderId,
//     orderInfo: orderInfo,
//     redirectUrl: redirectUrl,
//     ipnUrl: ipnUrl,
//     lang: lang,
//     requestType: requestType,
//     autoCapture: autoCapture,
//     extraData: extraData,
//     orderGroupId: orderGroupId,
//     signature: signature,
//   });
//   //Create the HTTPS objects
//   const options = {
//     method: "POST",
//     url: "https://test-payment.momo.vn/v2/gateway/api/create",
//     headers: {
//       "Content-Type": "application/json",
//       "Content-Length": Buffer.byteLength(requestBody),
//     },
//     data: requestBody,
//   };
//   let result;
//   try {
//     result = await axios(options);
//     res.status(200).json(result.data);
//   } catch (error) {
//     console.log(error);
//   }
// };
// const generateSignature2 = (rawSignature) => {
//   return crypto
//     .createHmac("sha256", process.env.SECRET_KEY)
//     .update(rawSignature)
//     .digest("hex");
// };
// const callbackPackagePayment = async (req, res) => {
//   const { orderId } = req.body;
//   console.log("ddddddddddddddddddddddddddddd", orderId);
//   const packageId = JSON.parse(req.body.extraData).packageId;
//   console.log("packageId", packageId);
//   const rawSignature = `accessKey=${ACCESS_KEY}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;
//   const signature = generateSignature2(rawSignature);
//   try {
//     const requestBody = JSON.stringify({
//       partnerCode: "MOMO",
//       requestId: orderId,
//       orderId,
//       signature,
//       lang: "vi",
//     });
//     const options = {
//       method: "POST",
//       url: "https://test-payment.momo.vn/v2/gateway/api/query",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       data: requestBody,
//     };
//     const result = await axios(options);
//     if (result.data.resultCode === 0) {
//       await Subscription.create({
//         user_id: packageId.user_id,
//         package_id: packageId.id,
//       });
//       console.log("result", result.data);
//       console.log("packageId", packageId);
//       return res.status(200).json({ success: true, data: result.data });
//     } else {
//       return res
//         .status(400)
//         .json({ success: false, message: "Payment failed", data: result.data });
//     }
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
module.exports = {
  createPayment,
  callback,
  // createPackagePayment,
  // callbackPackagePayment,
};
