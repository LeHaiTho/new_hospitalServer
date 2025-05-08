const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Appointment = require("./appointmentModel");

const HealthCheckInfo = sequelize.define(
  "HealthCheckInfo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Appointment,
        key: "id",
      },
    },
    weight: {
      type: DataTypes.STRING,
    },
    height: {
      type: DataTypes.STRING,
    },
    heart_rate: {
      type: DataTypes.STRING,
    },
    blood_pressure: {
      type: DataTypes.STRING,
    },
  },
  { timestamps: true, tableName: "HealthCheckInfos" }
);

module.exports = HealthCheckInfo;
