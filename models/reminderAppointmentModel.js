const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Appointment = require("./appointmentModel");

const ReminderAppointment = sequelize.define(
  "ReminderAppointment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Appointment,
        key: "id",
      },
    },
    reminder_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "sent", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  { timestamps: true, tableName: "ReminderAppointments" }
);

module.exports = ReminderAppointment;
