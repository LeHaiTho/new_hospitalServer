const sequelize = require("../config/database");
const Notification = require("../models/notificationModel");
const PushToken = require("../models/pushTokenModel");
const Appointment = require("../models/appointmentModel");

const { Op } = require("sequelize");

const createNotification = async (userId, type, data, url) => {
  const template = generateNotification(type, data);
  const expoPushToken = await PushToken.findOne({
    where: {
      user_id: userId,
    },
  });
  await Notification.create({
    user_id: userId,
    type: type,
    title: template?.title,
    body: template?.body,
    data: data,
    url: url,
    status: "unread",
  });
  if (expoPushToken) {
    await sendNotification(
      expoPushToken.pushToken,
      template?.title,
      template?.body,
      url
    );
  }
};
const createNewAppointmentNotification = async (
  userId,
  appointmentId,
  hospitalName,
  appointmentDate
) => {
  const data = {
    appointment_id: appointmentId,
    hospital_name: hospitalName,
    appointment_date: appointmentDate,
  };
  await createNotification(
    userId,
    "appointment_confirmed",
    data,
    `appointments/get-appointment-by-id/${appointmentId}`
  );
};
const createAppointmentReminder = async (
  userId,
  appointmentId,
  hospitalName,
  appointmentDate,
  appointmentSlot
) => {
  const data = {
    appointmentSlot: appointmentSlot.start_time,
    hospital_name: hospitalName,
    appointment_date: appointmentDate,
    appointment_id: appointmentId,
    appointmentSlot,
  };
  await createNotification(
    userId,
    "reminder",
    data,
    `appointments/get-appointment-by-id/${appointmentId}`
  );
};

const sendNotification = async (expoPushToken, title, body, url) => {
  try {
    const message = {
      to: expoPushToken,
      sound: "default",
      title: title,
      subtitle: "VH Booking 🏥",
      body: body,
      data: { url: url },
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

const generateNotification = (type, data) => {
  switch (type) {
    case "appointment_confirmed":
      return {
        title: `Đăng ký lịch hẹn thành công`,
        body: `Bạn đã đăng ký lịch hẹn thành công tại ${data.hospital_name} vào ngày ${data.appointment_date}`,
      };
    case "appointment_cancelled":
      return {
        title: `Hủy lịch hẹn`,
        body: `Bạn đã hủy lịch hẹn thành công tại ${data.hospital_name} vào ngày ${data.appointment_date}`,
      };
    case "reminder":
      return {
        title: `Nhắc nhở cuộc hẹn`,
        body: `Bạn có một cuộc hẹn vào ngày ${data.appointment_date} tại ${data.hospital_name} lúc ${data.appointmentSlot}`,
      };
    default:
      return {
        title: "Thông báo",
        body: "Bạn có một thông báo mới",
      };
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    const notificationDetails = notifications?.map((notification) => {
      const data = notification.data;

      const appointmentStatus = data.appointment_status;

      const template = generateNotification(notification?.type, data);

      return {
        id: notification?.id,
        user_id: notification?.user_id,
        type: notification?.type,
        title: template?.title,
        body: template?.body,
        status: notification?.status,
        createdAt: notification?.createdAt,
        updatedAt: notification?.updatedAt,
        url: notification?.url,
        data: data,
      };
    });

    res.status(200).json({
      notificationDetails,
    });
  } catch (error) {
    console.error("Error getting notification:", error);
  }
};

// mark notification as read
const markNotificationAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await Notification.update(
      { status: "read" },
      { where: { id, user_id: req.user.id } }
    );
    res.status(200).json({
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

// mark all notification as read
const markAllNotificationAsRead = async (req, res) => {
  try {
    await Notification.update(
      { status: "read" },
      { where: { user_id: req.user.id } }
    );
    res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
};

module.exports = {
  sendNotification,
  createNotification,
  createNewAppointmentNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationAsRead,
  createAppointmentReminder,
};
