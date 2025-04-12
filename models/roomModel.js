const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Hospital = require("./hospitalModel");
const CryptoJS = require("crypto-js");
const { config } = require("../controllers/paymentController");

const Room = sequelize.define(
  "Room",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    hospital_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Hospital,
        key: "id",
        as: "hospital",
      },
    },
  },
  {
    timestamps: true,
    tableName: "rooms",
  }
);

module.exports = Room;
const callback = async (req, res) => {
  let result = {};

  try {
    const dataStr = req.body.data; // Chuỗi JSON gốc từ ZaloPay
    const reqMac = req.body.mac;

    // Tính MAC từ chuỗi gốc
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    console.log("Generated mac:", mac);
    console.log("Received mac:", reqMac);

    // Kiểm tra MAC
    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
      console.log("Invalid callback:", result);
    } else {
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
      // --------------------------------------------------
      // const dataJson = JSON.parse(dataStr);
      // console.log("Callback data:", dataJson);
      // // Parse item để lấy thông tin appointment
      // const items = JSON.parse(dataJson.item); // item là chuỗi JSON, cần parse lại
      // const appointmentData = items[0]; // Lấy appointment đầu tiên
      // console.log("Appointment data:", appointmentData);
      // console.log("appointmentData.id", appointmentData.id);
      // // Cập nhật trạng thái appointment trong database
      // await Appointment.update(
      //   { status: "completed", payment_status: "paid" },
      //   { where: { id: appointmentData.id } }
      // );
      // result.return_code = 1;
      // result.return_message = "success";
      console.log(
        "Updated order status to SUCCESS for app_trans_id:",
        dataJson.app_trans_id
      );
    }
  } catch (ex) {
    result.return_code = 0; // ZaloPay sẽ thử lại
    result.return_message = ex.message;
    console.error("Callback error:", ex.message);
  }

  // Trả kết quả cho ZaloPay
  res.json(result);
};
